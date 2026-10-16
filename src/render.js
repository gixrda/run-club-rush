import {
  W, H, GROUND_Y, PATH_TOP, BACK_LANE_Y, PLAYER_X, METERS_PER_PX, COLORS as C,
  OBSTACLES, ANIMATIONS, RUNNER_HEIGHT, ITEM_SIZE, ITEMS, NONNA, ZONES,
} from './config.js';
import { drawClubRunner, drawNonna, shadow } from './characters.js';
import { text, outlined, fillPath, line } from './draw.js';
import {
  SCENES, paintClouds, drawSky, drawGround, drawBillboard, drawCrowd, drawRistoro, drawArch, VECTOR_OBSTACLES,
} from './scenery.js';
import { stationPose, drawStationBack, drawStationFront, drawStationPanel } from './station-view.js';

// Pickups without art on the sheet.
const VECTOR_ITEMS = {
  // rice cake with a honey drizzle
  galletta(ctx, x, y) {
    outlined(ctx, '#EBD3A0', () => ctx.ellipse(x, y, 9, 7, 0, 0, Math.PI * 2), 1.1);
    ctx.fillStyle = 'rgba(176,132,70,0.55)';
    for (const [dx, dy] of [[-4, -2], [1, -3], [4, 1], [-2, 2], [2, 3], [-5, 1]]) ctx.fillRect(x + dx, y + dy, 1.4, 1.4);
    fillPath(ctx, '#F2A30F', () => {
      ctx.moveTo(x - 6, y - 2);
      ctx.quadraticCurveTo(x, y - 6, x + 6, y - 1);
      ctx.quadraticCurveTo(x + 2, y + 1, x + 1, y + 5);
      ctx.quadraticCurveTo(x - 1, y + 1, x - 6, y - 2);
    });
  },
};

// ---------- renderer ----------
// `atlas.images` maps sprite keys ('runner/run1', 'obstacles/dog', ...) to native-resolution images.
// Keys missing from it fall back to vector shapes, so the game stays playable.
export function createRenderer(canvas, atlas = {}) {
  const ctx = canvas.getContext('2d');
  const images = atlas.images ?? new Map();
  let scale = canvas.width / W;
  let tiles = {};

  function tile(h, paint) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(W * scale);
    c.height = Math.ceil(h * scale);
    const g = c.getContext('2d');
    g.scale(scale, scale);
    paint(g);
    return c;
  }

  function resize(width, height) {
    canvas.width = width;
    canvas.height = height;
    scale = width / W;
    tiles = {
      clouds: tile(80, paintClouds),
      far: ZONES.map((z) => tile(112, SCENES[z.id].far)),
      mid: ZONES.map((z) => tile(92, SCENES[z.id].mid)),
    };
  }
  resize(canvas.width, canvas.height);

  // Logical size of a sheet sprite from its native image and a size spec.
  function sizeOf(img, spec) {
    const f = spec.scale ?? (spec.h ? spec.h / img.height : spec.w ? spec.w / img.width : spec.fit / Math.max(img.width, img.height));
    return [img.width * f, img.height * f];
  }

  // Draw a sheet sprite with its bottom at `bottom`, anchored horizontally at x.
  function sprite(key, x, bottom, spec, { flip = false, anchor = 0.5 } = {}) {
    const img = images.get(key);
    if (!img) return false;
    const [w, h] = sizeOf(img, spec);
    const left = x - (flip ? 1 - anchor : anchor) * w;
    const top = bottom - h;
    if (flip) {
      ctx.save();
      ctx.translate(left + w, top);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(img, left, top, w, h);
    }
    return true;
  }

  const runnerScale = () => {
    const idle = images.get('runner/idle');
    return idle ? RUNNER_HEIGHT / idle.height : 0.26;
  };

  function scroll(img, factor, y, traveled, alpha = 1) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    const off = -Math.floor(((traveled * factor) % W) * scale);
    const py = Math.round(y * scale);
    ctx.drawImage(img, off, py);
    ctx.drawImage(img, off + img.width, py);
    ctx.restore();
  }

  function prop(pr, t) {
    if (pr.type === 'billboard') drawBillboard(ctx, pr);
    else if (pr.type === 'crowd') drawCrowd(ctx, pr, t);
    else if (pr.type === 'ristoro') drawRistoro(ctx, pr);
  }

  // ---------- obstacles ----------
  function groupMembers(o, lane) {
    for (const m of o.members) {
      if (m.lane !== lane) continue;
      const mx = o.x + m.dx;
      if (o.type === 'runclub') {
        const back = lane === 'back';
        drawClubRunner(ctx, mx, back ? BACK_LANE_Y : GROUND_Y, o.anim * 9 * (m.look.cadence ?? 1) + m.phase, m.look, { facing: 1, scale: m.scale });
        continue;
      }
      if (m.kind === 'dog') {
        // the leash goes from the owner's hand (back lane) to the collar
        const owner = o.members.find((x) => x.kind === 'owner');
        const hop = -Math.abs(Math.sin(o.anim * 11) * 2);
        line(ctx, o.x + owner.dx + 6, BACK_LANE_Y - 16, mx + 9, GROUND_Y - 17 + hop, '#E5383B', 1);
        shadow(ctx, mx, GROUND_Y, 12);
        if (!sprite('obstacles/dog', mx, GROUND_Y + 1 + hop, { h: 26 })) {
          outlined(ctx, '#C98A3A', () => ctx.roundRect(mx - 12, GROUND_Y - 18, 24, 16, 5), 1);
        }
        continue;
      }
      // Granny crossing: walks from the back lane into the runner's lane long before reaching it.
      let y = lane === 'back' ? BACK_LANE_Y : GROUND_Y;
      if (m.cross) y = GROUND_Y - (GROUND_Y - PATH_TOP + 2) * Math.min(1, Math.max(0, (mx - NONNA.crossEndX) / NONNA.crossLen));
      drawNonna(ctx, mx, y, o.anim * 3.2 + m.dx, m.look, { facing: m.facing, scale: lane === 'back' ? 0.9 : 1, prop: m.prop });
    }
  }

  function obstacle(o) {
    const cfg = OBSTACLES[o.type];
    if (o.knocked) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - o.knockT * 1.5);
      ctx.translate(0, -o.knockT * 180 + o.knockT * o.knockT * 300);
    }
    if (o.members) {
      groupMembers(o, 'front');
      if (o.type === 'runclub' && !o.hit) {
        text(ctx, o.club.name, o.x + o.laneEnd / 2, GROUND_Y - 84, o.club.color, 7);
        if (Math.sin(o.anim * 2) > -0.3) text(ctx, 'A SINISTRA!', o.x + 6, GROUND_Y - 73, C.cream, 7.5);
      }
    } else if (cfg.sprite && images.has(cfg.sprite)) {
      // Small idle motion: flyers bob, the dog hops. Hitboxes don't move.
      const bob = cfg.fly ? Math.sin(o.anim * 9) * 1.5 : o.type === 'dog' ? -Math.abs(Math.sin(o.anim * 11) * 2) : 0;
      if (!cfg.fly) shadow(ctx, o.x + o.w / 2, GROUND_Y, o.w * 0.45);
      sprite(cfg.sprite, o.x + o.w / 2, GROUND_Y - cfg.lift + bob, cfg.size, { flip: o.type === 'dog' });
    } else if (VECTOR_OBSTACLES[o.type]) {
      if (!cfg.fly && !cfg.soft) shadow(ctx, o.x + o.w / 2, GROUND_Y, o.w * 0.45);
      VECTOR_OBSTACLES[o.type](ctx, o);
    } else {
      // Missing art: draw the hitbox as a hazard block so the game stays playable.
      const [inset, top, bottom] = cfg.box;
      outlined(ctx, C.orange, () => ctx.roundRect(o.x + inset, GROUND_Y - top, o.w - inset * 2, top - bottom, 3), 1);
    }
    if (o.knocked) ctx.restore();
  }

  function item(it) {
    const bob = Math.sin(it.bob) * 1.8;
    const cfg = ITEMS[it.type];
    const size = cfg.size ?? ITEM_SIZE;
    if (it.y > GROUND_Y - 20) shadow(ctx, it.x, GROUND_Y, 6);
    // soft light halo keeps pickups readable on busy backgrounds
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(it.x, it.y + bob, size * 0.55, 0, Math.PI * 2);
    ctx.fill();
    const img = it.sprite && images.get(it.sprite);
    if (img) {
      const [, h] = sizeOf(img, { fit: size });
      sprite(it.sprite, it.x, it.y + h / 2 + bob, { fit: size });
    } else if (VECTOR_ITEMS[it.type]) {
      VECTOR_ITEMS[it.type](ctx, it.x, it.y + bob);
    } else {
      outlined(ctx, C.gold, () => ctx.arc(it.x, it.y + bob, 6, 0, Math.PI * 2), 1);
    }
  }

  function fallbackRunner(x, y) {
    drawClubRunner(ctx, x, y, performance.now() / 90, { shirt: C.orange, shorts: C.navy, shoe: C.lime, skin: C.skin, hair: '#4A2C1A', cap: 'front', capColor: C.blue });
  }

  function draw(game) {
    const p = game.player;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.save();
    if (game.shake > 0 && !game.reducedMotion) {
      ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
    }

    // background layers: cross-fade between zones (prev fades out, current fades in)
    const zb = game.zoneBlend;
    const prev = SCENES[ZONES[game.prevZone].id];
    const cur = SCENES[ZONES[game.zone].id];
    const prevA = zb < 1 ? 1 - zb : 0;
    drawSky(ctx, prev, 1, game.t);
    drawSky(ctx, cur, zb, game.t);
    if (game.level >= 5 && !game.reducedMotion) {
      ctx.fillStyle = `hsla(${(game.t * 50) % 360}, 90%, 60%, 0.15)`;
      ctx.fillRect(0, 0, W, PATH_TOP);
    }
    scroll(tiles.clouds, 0.04, 6, game.traveled + game.t * 160, prev.clouds * prevA + cur.clouds * zb);
    scroll(tiles.far[game.prevZone], 0.1, PATH_TOP - 118, game.traveled, prevA);
    scroll(tiles.far[game.zone], 0.1, PATH_TOP - 118, game.traveled, zb);
    scroll(tiles.mid[game.prevZone], 0.35, PATH_TOP - 88, game.traveled, prevA);
    scroll(tiles.mid[game.zone], 0.35, PATH_TOP - 88, game.traveled, zb);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    for (const pr of game.props) prop(pr, game.t);
    drawGround(ctx, prev, game.traveled, 1);
    drawGround(ctx, cur, game.traveled, zb);

    if (game.mode !== 'attract') {
      const finishX = PLAYER_X + (game.finishM / METERS_PER_PX - game.traveled);
      if (finishX < W + 60 && finishX > -100) drawArch(ctx, finishX, game.marathon ? 'TRAGUARDO 42K' : 'TRAGUARDO');
      const startX = PLAYER_X + 40 - game.traveled;
      if (game.marathon && startX > -100) drawArch(ctx, startX, 'PARTENZA', C.blue);
    }
    const st = game.station;
    if (st) drawStationBack(ctx, st);

    // back lane first (behind the runner), then the runner's lane
    for (const o of game.obstacles) if (o.members) groupMembers(o, 'back');
    for (const o of game.obstacles) obstacle(o);
    for (const it of game.items) item(it);

    const rs = { scale: runnerScale() };
    // marathon ghost: your best time, as a translucent runner (when on screen)
    if (game.marathon && game.mode !== 'attract') {
      const gx = PLAYER_X + (game.ghostMeters - game.meters) / METERS_PER_PX;
      if (gx > -20 && gx < W + 20) {
        const f = ANIMATIONS.run.frames[Math.floor(game.t * 10) % 4];
        ctx.globalAlpha = 0.35;
        if (!sprite(f, gx, GROUND_Y + 1, rs, { anchor: atlas.anchors?.[f] ?? 0.5 })) fallbackRunner(gx, GROUND_Y);
        ctx.globalAlpha = 0.9;
        text(ctx, 'FANTASMA', gx, GROUND_Y - 58, '#BFE2FF', 6.5);
        ctx.globalAlpha = 1;
      }
    }

    // player: animation-controller frame from the sheet (a missing frame borrows another one).
    // At a station the station view picks the pose.
    const pose = st && game.inStation ? stationPose(st, game.t) : null;
    const want = pose?.frame ?? game.playerFrame;
    const frame = [want, ...ANIMATIONS[p.anim.state].frames, ...ANIMATIONS.run.frames].find((f) => images.has(f));
    const blink = !pose && p.invuln > 0 && p.anim.state !== 'hit' && Math.floor(p.invuln * 12) % 2 === 0;
    const drawPlayer = (x) => (frame ? sprite(frame, x, p.y + 1, rs, { anchor: atlas.anchors?.[frame] ?? 0.5 }) : fallbackRunner(x, p.y));
    shadow(ctx, PLAYER_X + (pose?.dx ?? 0), GROUND_Y, p.onGround ? 10 : Math.max(4, 10 - (GROUND_Y - p.y) / 10));
    if (pose) {
      ctx.save();
      ctx.translate(PLAYER_X + pose.dx, p.y + pose.dy);
      ctx.rotate(pose.rot);
      ctx.scale(1, pose.sy);
      ctx.translate(-PLAYER_X, -p.y);
      drawPlayer(PLAYER_X);
      ctx.restore();
    } else {
      if (game.boostT > 0) {
        ctx.globalAlpha = 0.22;
        drawPlayer(PLAYER_X - 14);
        ctx.globalAlpha = 0.4;
        drawPlayer(PLAYER_X - 7);
        ctx.globalAlpha = 1;
      }
      if (!blink) drawPlayer(PLAYER_X);
    }
    if (st) drawStationFront(ctx, st, pose?.rot ?? 0);
    if (game.stamina <= 0 && !blink && !pose) {
      ctx.fillStyle = '#8FC8FF';
      for (const [dx, dy, k] of [[-10, -46, 2], [9, -42, 3]]) {
        ctx.beginPath();
        ctx.ellipse(PLAYER_X + dx, p.y + dy + ((p.phase * k) % 5), 1.1, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (game.multT > 0 && !blink) text(ctx, 'x2', PLAYER_X, p.y - 60, C.lime, 10);

    for (const pt of game.particles) {
      ctx.globalAlpha = Math.min(1, pt.life / pt.max + 0.2);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const tx of game.texts) {
      ctx.globalAlpha = Math.min(1, tx.life * 2);
      text(ctx, tx.text, tx.x, tx.y, tx.color, 10);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // the wall: the world darkens at the edges while you suffer
    if (game.marathon && game.stageInfo?.choice && game.mode === 'run') {
      const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
      v.addColorStop(0, 'rgba(11,22,48,0)');
      v.addColorStop(1, `rgba(11,22,48,${game.stamina < 30 ? 0.6 : 0.42})`);
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, W, H);
    }
    if (st) drawStationPanel(ctx, st);

    if (game.flash > 0 && !game.reducedMotion) {
      ctx.globalAlpha = Math.min(0.3, game.flash);
      ctx.fillStyle = game.flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  return { draw, resize };
}

