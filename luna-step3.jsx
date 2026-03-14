import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

const CX = 28, CZ = -28, CW = 14, CH = 14, nimTY = 1.5;

const QUESTS = [
  { id:0, name:"The Rescue", goal:8, color:0x9d4edd, colorStr:"#9d4edd", label:"🔮 Crystals", spi:20,
    pos:[[-6,6],[6,-6],[15,5],[-14,-5],[3,20],[-3,-22],[20,-8],[-18,10]] },
  { id:1, name:"The Magic Mirror", goal:5, color:0x00ccff, colorStr:"#00ccff", label:"🪞 Shards", spi:30,
    pos:[[8,14],[-12,8],[22,-3],[-20,-14],[5,-26]] },
  { id:2, name:"Moon Flowers", goal:6, color:0xffcc00, colorStr:"#ffcc00", label:"🌸 Flowers", spi:35,
    pos:[[-8,22],[16,-18],[0,28],[-25,5],[12,16],[-5,-28]] },
  { id:3, name:"Shadow Crystals", goal:7, color:0x6600cc, colorStr:"#6600cc", label:"💀 Dark Shards", spi:40,
    pos:[[25,10],[-22,-18],[10,26],[-15,20],[18,-22],[0,-30],[28,-8]] },
  { id:4, name:"Star Pets", goal:4, color:0xffaa00, colorStr:"#ffaa00", label:"⭐ Star Pets", spi:45,
    pos:[[20,20],[-20,18],[15,-25],[-18,-20]] },
  { id:5, name:"Rainbow Gems", goal:8, color:0xff4488, colorStr:"#ff4488", label:"💎 Rainbow Gems", spi:50,
    pos:[[5,25],[-5,-25],[24,14],[-22,12],[10,-28],[-12,-26],[28,0],[-28,0]] },
  { id:6, name:"The Final Showdown", goal:3, color:0x00ff88, colorStr:"#00ff88", label:"⚗️ Ingredients", spi:100,
    pos:[[-10,15],[12,-20],[0,-30]] }
];

const NPCS = [
  {t:"owl",e:"🦉",n:"Ollie",p:[8,8]},{t:"bunny",e:"🐰",n:"Benny",p:[-8,-8]},
  {t:"fairy",e:"🧚",n:"Fifi",p:[14,-4]},{t:"fox",e:"🦊",n:"Foxie",p:[-5,12]},
  {t:"owl",e:"🦉",n:"Ollie",p:[20,5]},{t:"bunny",e:"🐰",n:"Benny",p:[-15,-12]},
  {t:"fairy",e:"🧚",n:"Fifi",p:[0,18]},{t:"fox",e:"🦊",n:"Foxie",p:[10,-18]}
];

const DLG_B = {
  owl:["Hoot! The castle burns!","Dark shadows near the towers...","Collect crystals quickly!"],
  bunny:["*trembles* The fire is scary!","Please save the King and Queen!","I believe in you, Luna!"],
  fairy:["I can feel the crystals nearby!","The Shadow's power grows...","You're so brave!"],
  fox:["I smell smoke from the castle...","Follow the crystal glow!","Be swift, little princess!"]
};
const DLG_H = {
  owl:["Hoot! The kingdom is beautiful!","You're the bravest cat!","Stars shine brighter now!"],
  bunny:["*hops happily* Wonderful!","Thank you for saving everyone!","The meadows are so pretty!"],
  fairy:["My magic sings with joy!","Flowers bloom everywhere!","Princess Luna, hero of Nimbus!"],
  fox:["The kingdom smells like flowers!","You did it, Luna!","Every creature thanks you!"]
};

const HINTS = ["Follow the glow, dear Luna... 💜","You are braver than you know! ✨",
  "The kingdom believes in you! 🌟","Look everywhere — even behind clouds! 👀","Your heart is your greatest power! 💜✨"];

const SLIDES = [
  {emoji:"👑🐱",title:"Princess Luna",text:"Luna is a brave little cat princess who lives in the cloud kingdom of Nimbus, high above the world!"},
  {emoji:"🔥🌩️",title:"The Fire!",text:"An evil Shadow attacked the castle and set it ablaze! The King and Queen are trapped inside!"},
  {emoji:"💜✨",title:"Grandma Stella",text:"Luna's grandmother's spirit appears as a glowing purple light to guide her on her quest!"},
  {emoji:"🗺️🔥",title:"The Rescue Mission!",text:"Collect 8 magical crystals to unlock the castle gate, rescue Mama and Papa, and save the kingdom!"}
];

const QUEST_MSGS = [
  {pm:"Luna, you saved us! We're so proud of you!",ni:"Find 5 mirror shards scattered across the kingdom!"},
  {pm:"The Magic Mirror is restored!",ni:"Gather 6 rare Moon Flowers to bring colour back!"},
  {pm:"The Moon Flowers bloom again!",ni:"Collect 7 Shadow Crystals before they corrupt the land!"},
  {pm:"The dark crystals are purified!",ni:"Rescue 4 lost Star Pets and bring them home!"},
  {pm:"The Star Pets are safe!",ni:"Find 8 Rainbow Gems hidden throughout the kingdom!"},
  {pm:"All Rainbow Gems collected!",ni:"Collect 3 potion ingredients and confront The Shadow!"},
  {pm:"The Shadow is defeated forever!",ni:"The kingdom is at peace! Adventure never ends..."}
];

export default function LunaStep3() {
  const [page, setPage] = useState("story");
  const [slide, setSlide] = useState(0);
  const [questId, setQuestId] = useState(0);
  const [collected, setCollected] = useState(0);
  const [score, setScore] = useState(0);
  const [notif, setNotif] = useState(null);
  const [questScreen, setQuestScreen] = useState(null);
  const [musicOn, setMusicOn] = useState(false);

  const ref = useRef(null);
  const cleanRef = useRef(null);
  const nextQRef = useRef(null);
  const gs = useRef({ qid: 0, col: 0, sc: 0, fk: false, fq: false });
  const nTimer = useRef(null);
  const musicRef = useRef(null);
  const camAngleRef = useRef(Math.PI);
  const jumpRef = useRef(false);
  const joyRef = useRef({ a: false, dx: 0, dy: 0 });

  const notify = useCallback((msg, dur = 3500) => {
    if (nTimer.current) clearTimeout(nTimer.current);
    setNotif(msg);
    nTimer.current = setTimeout(() => setNotif(null), dur);
  }, []);

  const stopMu = useCallback(() => {
    if (musicRef.current) { try { musicRef.current.stop(); } catch(e){} musicRef.current = null; }
  }, []);

  const startMu = useCallback((theme = "dark") => {
    try {
      stopMu();
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const gn = ac.createGain(); gn.gain.value = 0.12; gn.connect(ac.destination);
      let run = true, nt = ac.currentTime + 0.1;
      const dkS = [261.6,293.7,311.1,349.2,392,415.3,466.2,523.3,554.4,587.3];
      const brS = [523.3,587.3,659.3,698.5,784,830.6,880,987.8,1047,1175];
      const pn = (f,t,d,tp="sine",v=0.3) => {
        if(!run) return;
        const o = ac.createOscillator(), g2 = ac.createGain();
        o.type = tp; o.frequency.value = f;
        g2.gain.setValueAtTime(v, t); g2.gain.exponentialRampToValueAtTime(0.001, t+d);
        o.connect(g2); g2.connect(gn); o.start(t); o.stop(t+d);
      };
      const sched = () => {
        if (!run) return;
        while (nt < ac.currentTime + 1) {
          if (theme === "dark") {
            const n = dkS[Math.floor(Math.random()*dkS.length)];
            pn(n, nt, 0.5, "sine", 0.2);
            if (Math.random() < 0.25) pn(n*0.5, nt, 0.8, "triangle", 0.12);
            nt += 0.4 + Math.random()*0.2;
          } else {
            const n = brS[Math.floor(Math.random()*brS.length)];
            pn(n, nt, 0.3, "sine", 0.18);
            if (Math.random() < 0.33) pn(n*1.25, nt+0.05, 0.25, "sine", 0.1);
            nt += 0.25 + Math.random()*0.15;
          }
        }
        if (run) setTimeout(sched, 200);
      };
      sched();
      musicRef.current = { stop: () => { run = false; ac.close().catch(()=>{}); }, theme };
    } catch(e) {}
  }, [stopMu]);

  const toggleMu = useCallback(() => {
    if (musicOn) { stopMu(); setMusicOn(false); }
    else { startMu("dark"); setMusicOn(true); }
  }, [musicOn, startMu, stopMu]);

  const startNextQuestReact = useCallback(() => {
    setQuestScreen(null);
    const g = gs.current;
    const nid = g.qid >= 6 ? 1 : g.qid + 1;
    if (g.qid === 0 && nid === 1) {
      g.qid = 1; g.col = 0; g.fk = false; g.fq = false;
      setQuestId(1); setCollected(0);
      if (cleanRef.current) cleanRef.current();
      setTimeout(() => { if (ref.current) buildGame(ref.current); }, 100);
    } else {
      g.qid = nid; g.col = 0; g.fk = false; g.fq = false;
      setQuestId(nid); setCollected(0);
      if (nextQRef.current) nextQRef.current(nid);
    }
  }, []);

  // ===================== BUILD GAME =====================
  const buildGame = useCallback((container) => {
    const g = gs.current;
    const burn = g.qid === 0;

    const w = Math.min(container.clientWidth, 520);
    const h = w * 0.75;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(burn ? 0x070318 : 0x1a0d3a);
    scene.fog = new THREE.FogExp2(burn ? 0x0a0420 : 0x2d1060, burn ? 0.021 : 0.014);

    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 200);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    renderer.domElement.style.borderRadius = "12px";

    // Lights
    scene.add(new THREE.AmbientLight(burn ? 0x2a1040 : 0x6a40a0, burn ? 2.2 : 3.5));
    const dl = new THREE.DirectionalLight(burn ? 0x9d7fe8 : 0xd4b0ff, burn ? 1.8 : 2.8);
    dl.position.set(10, 20, 10); scene.add(dl);
    [[0,8,0],[-15,6,15],[15,6,-15]].forEach(p => {
      const pl = new THREE.PointLight(burn ? 0x7c3aed : 0xa855f7, burn ? 1.2 : 2, 30);
      pl.position.set(p[0],p[1],p[2]); scene.add(pl);
    });

    // State
    let rainbowVis = false, innerDoorClosed = burn, shadowDead = false;
    let ticks = 0, lastHint = -200;
    // Helper: create and position
    const mkAt = (obj, x, y, z) => { obj.position.set(x, y, z); return obj; };


    // Terrain
    const terrainY = (x, z) => {
      if (Math.abs(x-CX) < CW/2 && Math.abs(z-CZ) < CH/2) return nimTY;
      if (rainbowVis) {
        if (Math.abs(x) < 2.5 && z > -65 && z < 0) return 8;
        if (Math.abs(x) < 15 && z < -57 && z > -93) return 8;
      }
      let hh = Math.sin(x*0.15)*1.2 + Math.sin(z*0.12)*1 + Math.sin(x*0.08+z*0.06)*0.8 + Math.sin(x*0.25)*0.4 + Math.cos(z*0.2)*0.5;
      const dx = Math.abs(x-CX)-CW/2, dz = Math.abs(z-CZ)-CH/2, d = Math.max(dx,dz);
      if (d < 5 && d > 0) { const t2 = d/5; hh = hh*t2 + nimTY*(1-t2); }
      return Math.max(hh, 0);
    };

    const blocked = (x, z) => {
      if (Math.abs(x) > 34 || Math.abs(z) > 34) {
        if (rainbowVis && Math.abs(x) < 15 && z > -93 && z < 0) return false;
        return true;
      }
      const x1=CX-CW/2, x2=CX+CW/2, z1=CZ-CH/2, z2=CZ+CH/2, wt=0.8;
      if (x > x1-wt && x < x2+wt && z > z1-wt && z < z2+wt) {
        const iX = x > x1 && x < x2, iZ = z > z1 && z < z2;
        if (iX && iZ) { if (innerDoorClosed && z < CZ-1) return true; return false; }
        if (Math.abs(z-z2) < wt && iX) { if (Math.abs(x-CX) < 2.5) return false; return true; }
        if (Math.abs(z-z1) < wt && iX) return true;
        if (Math.abs(x-x1) < wt && iZ) return true;
        if (Math.abs(x-x2) < wt && iZ) return true;
      }
      return false;
    };

    // Terrain mesh
    const tGeo = new THREE.PlaneGeometry(70, 70, 70, 70);
    tGeo.rotateX(-Math.PI/2);
    const pos = tGeo.attributes.position;
    const vcols = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = terrainY(x, z);
      pos.setY(i, y);
      const hv = y / 3;
      if (burn) { vcols[i*3]=0.08+hv*0.05; vcols[i*3+1]=0.04+hv*0.03; vcols[i*3+2]=0.15+hv*0.08; }
      else { vcols[i*3]=0.1+hv*0.06; vcols[i*3+1]=0.08+hv*0.07; vcols[i*3+2]=0.2+hv*0.1; }
    }
    tGeo.setAttribute("color", new THREE.BufferAttribute(vcols, 3));
    tGeo.computeVertexNormals();
    scene.add(new THREE.Mesh(tGeo, new THREE.MeshLambertMaterial({ vertexColors: true })));

    // Stars
    const sGeo = new THREE.BufferGeometry();
    const sV = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      const th = Math.random()*Math.PI*2, ph = Math.random()*Math.PI*0.5, r = 60+Math.random()*15;
      sV[i*3] = r*Math.sin(ph)*Math.cos(th); sV[i*3+1] = r*Math.cos(ph); sV[i*3+2] = r*Math.sin(ph)*Math.sin(th);
    }
    sGeo.setAttribute("position", new THREE.BufferAttribute(sV, 3));
    scene.add(new THREE.Points(sGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.3 })));

    // Cloud pillars
    const cc = burn ? 0x2a1060 : 0x5b3090;
    for (let i = 0; i < 25; i++) {
      const cx2 = ((i*137+42)%60)-30, cz2 = ((i*89+17)%60)-30;
      if (Math.abs(cx2-CX)<10 && Math.abs(cz2-CZ)<10) continue;
      const cy = terrainY(cx2, cz2);
      const pil = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.4,1.5,6),
        new THREE.MeshLambertMaterial({color:cc,emissive:cc,emissiveIntensity:0.3}));
      stem.position.y = 0.75; pil.add(stem);
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.7,6,4),
        new THREE.MeshLambertMaterial({color:cc,emissive:cc,emissiveIntensity:0.3}));
      top.position.y = 1.5; top.scale.y = 0.5; pil.add(top);
      pil.position.set(cx2, cy, cz2); scene.add(pil);
    }

    // ---- CASTLE ----
    const wc = burn ? 0x1a0a0a : 0x4a1890;
    const tc2 = burn ? 0x2d1010 : 0x7c3aed;
    const spc = burn ? 0x3d0505 : 0xb040f0;
    const wMat = new THREE.MeshLambertMaterial({color:wc, emissive:wc, emissiveIntensity:0.2});
    const tMat = new THREE.MeshLambertMaterial({color:tc2, emissive:tc2, emissiveIntensity:0.3});
    const sMat = new THREE.MeshLambertMaterial({color:spc, emissive:spc, emissiveIntensity:0.4});

    const hall = new THREE.Mesh(new THREE.BoxGeometry(CW-2, 4, CH-2), wMat);
    hall.position.set(CX, nimTY+2, CZ); scene.add(hall);

    const mw = (w2,h2,d,px,py,pz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w2,h2,d), wMat); m.position.set(px,py,pz); scene.add(m); };
    mw(CW,5,0.5, CX,nimTY+2.5,CZ-CH/2);
    mw(0.5,5,CH, CX+CW/2,nimTY+2.5,CZ);
    mw(0.5,5,CH, CX-CW/2,nimTY+2.5,CZ);
    mw((CW-5)/2,5,0.5, CX-CW/4-5/4+0.6, nimTY+2.5, CZ+CH/2);
    mw((CW-5)/2,5,0.5, CX+CW/4+5/4-0.6, nimTY+2.5, CZ+CH/2);

    const arch = new THREE.Mesh(new THREE.BoxGeometry(5.5,1,0.5), tMat);
    arch.position.set(CX, nimTY+5, CZ+CH/2); scene.add(arch);

    [[CX-CW/2,CZ-CH/2],[CX+CW/2,CZ-CH/2],[CX-CW/2,CZ+CH/2],[CX+CW/2,CZ+CH/2]].forEach(([tx,tz]) => {
      const tw = new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.4,7,8), tMat);
      tw.position.set(tx, nimTY+3.5, tz); scene.add(tw);
      const sp = new THREE.Mesh(new THREE.ConeGeometry(1.5,3,8), sMat);
      sp.position.set(tx, nimTY+8.5, tz); scene.add(sp);
    });

    for (let i = 0; i < 6; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(1,1,0.6), tMat);
      b.position.set(CX-CW/2+1.5+i*2, nimTY+5.5, CZ-CH/2); scene.add(b);
    }

    let iDoor = null;
    if (burn) {
      iDoor = new THREE.Mesh(new THREE.BoxGeometry(4,4,0.4),
        new THREE.MeshLambertMaterial({color:0x3a1515, emissive:0x2a0a0a, emissiveIntensity:0.3}));
      iDoor.position.set(CX, nimTY+2, CZ-1); scene.add(iDoor);
    }

    const mkThrone = (tx, col, tilt=0) => {
      const thr = new THREE.Group();
      const mat = new THREE.MeshLambertMaterial({color:col, emissive:col, emissiveIntensity:0.3});
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1,0.3,1), mat); seat.position.y = 0.5; thr.add(seat);
      const bk = new THREE.Mesh(new THREE.BoxGeometry(1,1.5,0.2), mat); bk.position.set(0,1.2,-0.4); thr.add(bk);
      thr.position.set(tx, nimTY, CZ-CH/2+2); thr.rotation.z = tilt; scene.add(thr);
    };
    if (burn) { mkThrone(CX-2, 0x3a2a10, 0.15); mkThrone(CX+2, 0x3a1025, -0.1); }
    else { mkThrone(CX-2, 0xfbbf24); mkThrone(CX+2, 0xf472b6); }

    (burn ? [0xff6600,0xff4400,0xff8800,0xff5500,0xff3300] : [0xa855f7,0xfbbf24,0xc084fc,0xe9d5ff,0x7c3aed])
      .forEach((c,i) => { const cl = new THREE.PointLight(c, burn?1.5:2, 12); cl.position.set(CX-4+i*2, nimTY+3, CZ); scene.add(cl); });

    // Particles
    const parts = [];
    if (burn) {
      const fps = [[CX-3,CZ-3],[CX+3,CZ-3],[CX-3,CZ+3],[CX+3,CZ+3],[CX,CZ],[CX-5,CZ],[CX+5,CZ]];
      for (let i = 0; i < 35; i++) {
        const fp = fps[i%7];
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.15,4,4),
          new THREE.MeshBasicMaterial({color: i%2 ? 0xffcc00 : 0xff6600, transparent:true, opacity:0.8}));
        p.position.set(fp[0]+Math.random()*2-1, nimTY+2+Math.random()*4, fp[1]+Math.random()*2-1);
        p.userData = {bY: p.position.y, sp: 1+Math.random()*2, off: Math.random()*10};
        scene.add(p); parts.push(p);
      }
    } else {
      for (let i = 0; i < 30; i++) {
        const a = (i/30)*Math.PI*2, r = 8+Math.random()*3;
        const cs2 = [0xe9d5ff,0xc084fc,0xfbbf24,0xf472b6,0xa855f7];
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.1,4,4),
          new THREE.MeshBasicMaterial({color: cs2[i%5], transparent:true, opacity:0.7}));
        p.position.set(CX+Math.cos(a)*r, nimTY+3+Math.random()*3, CZ+Math.sin(a)*r);
        p.userData = {a, r, sp:0.3+Math.random()*0.3, bY:p.position.y};
        scene.add(p); parts.push(p);
      }
    }

    if (!burn) {
      for (let i = 0; i < 60; i++) {
        const fx = Math.random()*60-30, fz = Math.random()*60-30;
        if (Math.abs(fx-CX)<8 && Math.abs(fz-CZ)<8) continue;
        const fcs = [0xff69b4,0xffcc00,0xff4488,0x00ccff,0xa855f7,0xff6600];
        const fl = new THREE.Mesh(new THREE.SphereGeometry(0.2,6,4), new THREE.MeshBasicMaterial({color:fcs[i%6]}));
        fl.position.set(fx, terrainY(fx,fz)+0.3, fz); scene.add(fl);
      }
    }

    // Billboard
    const mkBB = (emoji, sz = 2) => {
      const c2 = document.createElement("canvas"); c2.width = 128; c2.height = 128;
      const ctx = c2.getContext("2d"); ctx.font = "80px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(emoji, 64, 64);
      return new THREE.Mesh(new THREE.PlaneGeometry(sz, sz),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c2), transparent: true, side: THREE.DoubleSide }));
    };

    const kBB = mkBB("🤴", 2.5); kBB.position.set(CX-1.5, nimTY+2.3, CZ-CH/2+2.2); scene.add(kBB);
    const qBB = mkBB("👸", 2.5); qBB.position.set(CX+1.5, nimTY+2.3, CZ-CH/2+2.2); scene.add(qBB);

    const stG = new THREE.Group();
    const stOrb = new THREE.Mesh(new THREE.SphereGeometry(0.5,12,8),
      new THREE.MeshBasicMaterial({color:0xa855f7, transparent:true, opacity:0.6}));
    stG.add(stOrb); stG.add(new THREE.PointLight(0xa855f7, 1.5, 8));
    stG.position.set(3, 2.5, 3); scene.add(stG);

    const npcM = NPCS.map(npc => {
      const bb = mkBB(npc.e, 2);
      bb.position.set(npc.p[0], terrainY(npc.p[0],npc.p[1])+1.5, npc.p[1]);
      bb.userData = {...npc, lt:-1000, li:0}; scene.add(bb); return bb;
    });

    // Luna
    const luG = new THREE.Group();
    const bMat = new THREE.MeshLambertMaterial({color:0xf5d0a9, emissive:0xf5d0a9, emissiveIntensity:0.1});
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.75,0.85,0.55), bMat); body.position.y = 0.6; luG.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.65,0.6,0.5), bMat); head.position.y = 1.35; luG.add(head);
    const eMat = new THREE.MeshLambertMaterial({color:0xe8b88a});
    [[-0.2,1.75,0],[0.2,1.75,0]].forEach(p => { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.12,0.3,4), eMat); ear.position.set(p[0],p[1],p[2]); luG.add(ear); });
    const eyM = new THREE.MeshBasicMaterial({color:0x1a1a2e});
    [[-0.15,1.4,0.26],[0.15,1.4,0.26]].forEach(p => { const ey = new THREE.Mesh(new THREE.SphereGeometry(0.06,6,4), eyM); ey.position.set(p[0],p[1],p[2]); luG.add(ey); });
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.28,0.2,8,1,true),
      new THREE.MeshLambertMaterial({color:0xfbbf24, emissive:0xfbbf24, emissiveIntensity:0.5}));
    crown.position.y = 1.72; luG.add(crown);
    const luLight = new THREE.PointLight(0xfbbf24, 1, 5); luLight.position.y = 1.5; luG.add(luLight);
    const startY = terrainY(0, 5) + 0.18;
    luG.position.set(0, startY, 5); scene.add(luG);
    const lu = { x:0, y:startY, z:5, vy:0, gnd:true, face:0 };

    // Collectibles
    let colls = [];
    const spawnC = (qi) => {
      colls.forEach(c => scene.remove(c)); colls = [];
      const q = QUESTS[qi];
      q.pos.forEach(([px,pz]) => {
        const py = terrainY(px,pz)+1.4;
        const gr = new THREE.Group();
        gr.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.4,0),
          new THREE.MeshLambertMaterial({color:q.color, emissive:q.color, emissiveIntensity:0.6})));
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5,0.05,8,16),
          new THREE.MeshBasicMaterial({color:q.color, transparent:true, opacity:0.5}));
        ring.rotation.x = Math.PI/2; ring.position.y = -0.3; gr.add(ring);
        gr.add(new THREE.PointLight(q.color, 0.8, 5));
        gr.position.set(px, py, pz); gr.userData = {col:false};
        scene.add(gr); colls.push(gr);
      });
    };
    spawnC(g.qid);

    // Path
    let pathM = [];
    const buildPath = () => {
      if (pathM.length) return;
      for (let i = 0; i < 40; i++) {
        const t = i/39, px = t*CX, pz = (1-t)*5 + t*(CZ+CH/2+1);
        const py = terrainY(px,pz)+0.3;
        const col = i%2 ? 0x7c3aed : 0x9d4edd;
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.2,6,4),
          new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:0.8}));
        m.position.set(px,py,pz); m.userData = {bY:py}; scene.add(m); pathM.push(m);
        if (i%5===0) { const pl = new THREE.PointLight(col,0.5,4); pl.position.set(px,py+0.5,pz); scene.add(pl); }
      }
    };

    // Shadow
    const shG = new THREE.Group();
    const shS = new THREE.Mesh(new THREE.SphereGeometry(1.8,16,12),
      new THREE.MeshBasicMaterial({color:0x0a0010, transparent:true, opacity:0.85}));
    shG.add(shS);
    const shR = [0x4a0080,0x6600aa,0x330066].map((c,i) => {
      const r = new THREE.Mesh(new THREE.TorusGeometry(2.2+i*0.3,0.08,8,32), new THREE.MeshBasicMaterial({color:c}));
      r.rotation.x = Math.PI/3*(i+1); r.rotation.z = Math.PI/4*i; shG.add(r); return r;
    });
    [[-0.5,0.3,1.6],[0.5,0.3,1.6]].forEach(p => {
      const ey = new THREE.Mesh(new THREE.SphereGeometry(0.2,8,6), new THREE.MeshBasicMaterial({color:0xff0000}));
      ey.position.set(p[0],p[1],p[2]); shG.add(ey);
    });
    shG.add(new THREE.PointLight(0x6600cc, 2, 10));
    shG.position.set(0, terrainY(0,-15)+3, -15); shG.visible = false; scene.add(shG);

    // Cauldron
    const cdG = new THREE.Group();
    const bwl = new THREE.Mesh(new THREE.SphereGeometry(0.8,12,8,0,Math.PI*2,0,Math.PI/2),
      new THREE.MeshLambertMaterial({color:0x1a1a1a, side:THREE.DoubleSide}));
    bwl.rotation.x = Math.PI; bwl.position.y = 1; cdG.add(bwl);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.8,0.08,8,16), new THREE.MeshLambertMaterial({color:0x333333}));
    rim.rotation.x = Math.PI/2; rim.position.y = 1; cdG.add(rim);
    for (let i = 0; i < 3; i++) {
      const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.5,6), new THREE.MeshLambertMaterial({color:0x333333}));
      lg.position.set(Math.cos(i*Math.PI*2/3)*0.5, 0.25, Math.sin(i*Math.PI*2/3)*0.5); cdG.add(lg);
    }
    const cdL = new THREE.PointLight(0x00ff88, 1.5, 6); cdL.position.y = 1.5; cdG.add(cdL);
    cdG.position.set(CX, nimTY, CZ-2); cdG.visible = false; scene.add(cdG);

    // Rainbow bridge
    const brG = new THREE.Group();
    const rbc = [0xff0000,0xff8800,0xffff00,0x00cc00,0x0000ff,0x8800ff,0xff44aa];
    for (let i = 0; i < 65; i++) {
      const pl = new THREE.Mesh(new THREE.BoxGeometry(5,0.2,0.8),
        new THREE.MeshLambertMaterial({color:rbc[i%7], emissive:rbc[i%7], emissiveIntensity:0.3}));
      pl.position.set(0, 8, -i); brG.add(pl);
    }
    for (let s = -1; s <= 1; s += 2) {
      const rl = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.8,65),
        new THREE.MeshLambertMaterial({color:0xfbbf24, emissive:0xfbbf24, emissiveIntensity:0.3}));
      rl.position.set(s*2.4, 8.5, -32.5); brG.add(rl);
    }
    for (let i = 0; i < 13; i++) { brG.add(mkAt(new THREE.PointLight(rbc[i%7], 0.8, 5), 0,9,-i*5)); }
    brG.visible = false; scene.add(brG);

    // Rainbow castle
    const rcG = new THREE.Group();
    const rcX2=0, rcZ2=-75, rcY2=8;
    rcG.add(((o)=>{o.position.set(rcX2,rcY2-0.25,rcZ2);return o;})(new THREE.Mesh(new THREE.BoxGeometry(32,0.5,38), new THREE.MeshLambertMaterial({color:0xfbbf24, emissive:0xfbbf24, emissiveIntensity:0.2}))));
    rcG.add(((o)=>{o.position.set(rcX2,rcY2+3,rcZ2);return o;})(new THREE.Mesh(new THREE.BoxGeometry(28,6,34), new THREE.MeshLambertMaterial({color:0xe8d5f5, emissive:0xd4b0ff, emissiveIntensity:0.2}))));
    rcG.add(((o)=>{o.position.set(rcX2,rcY2+6.25,rcZ2);return o;})(new THREE.Mesh(new THREE.BoxGeometry(30,0.5,36), new THREE.MeshLambertMaterial({color:0xff69b4, emissive:0xff69b4, emissiveIntensity:0.3}))));
    [[-14,-18],[14,-18],[-14,18],[14,18]].forEach(([tx,tz]) => {
      rcG.add(((o)=>{o.position.set(rcX2+tx,rcY2+4,rcZ2+tz);return o;})(new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.8,8,8), new THREE.MeshLambertMaterial({color:0xe8d5f5, emissive:0xd4b0ff, emissiveIntensity:0.2}))));
      rcG.add(((o)=>{o.position.set(rcX2+tx,rcY2+9.5,rcZ2+tz);return o;})(new THREE.Mesh(new THREE.ConeGeometry(2,3,8), new THREE.MeshLambertMaterial({color:0xff69b4, emissive:0xff69b4, emissiveIntensity:0.4}))));
    });
    const gdm = new THREE.MeshLambertMaterial({color:0xfbbf24, emissive:0xdaa520, emissiveIntensity:0.3});
    const gdL = new THREE.Mesh(new THREE.BoxGeometry(1.8,4,0.2), gdm); gdL.position.set(rcX2-1, rcY2+2.5, rcZ2+17); rcG.add(gdL);
    const gdR = new THREE.Mesh(new THREE.BoxGeometry(1.8,4,0.2), gdm); gdR.position.set(rcX2+1, rcY2+2.5, rcZ2+17); rcG.add(gdR);
    let rcGO = false;
    const rcRooms = [
      {n:"Throne Room",e:"👑",c:0xfbbf24,p:[0,0]},{n:"Treasure Room",e:"💎",c:0xff8800,p:[-8,0]},
      {n:"Star Room",e:"⭐",c:0x4488ff,p:[8,0]},{n:"Garden Room",e:"🌸",c:0x44cc44,p:[0,-10]},
      {n:"Moon Library",e:"📚",c:0x8844cc,p:[-8,-10]},{n:"Crystal Chamber",e:"🔮",c:0x00cccc,p:[8,-10]}
    ];
    const rv = {};
    rcRooms.forEach(rm => {
      rv[rm.n] = false;
      rcG.add(((o)=>{o.position.set(rcX2+rm.p[0], rcY2+0.05, rcZ2+rm.p[1]);return o;})(new THREE.Mesh(new THREE.BoxGeometry(7,0.1,7), new THREE.MeshLambertMaterial({color:rm.c, emissive:rm.c, emissiveIntensity:0.2}))));
      rcG.add(mkAt(new THREE.PointLight(rm.c, 1.5, 8), rcX2+rm.p[0], rcY2+4, rcZ2+rm.p[1]));
      const sign = mkBB(rm.e, 1.5); sign.position.set(rcX2+rm.p[0], rcY2+4.5, rcZ2+rm.p[1]); rcG.add(sign);
    });
    rcG.add(mkAt(new THREE.PointLight(0xffffff, 3, 50), rcX2,rcY2+15,rcZ2));
    rcG.visible = false; scene.add(rcG);

    nextQRef.current = (nid) => { spawnC(nid); shG.visible = nid === 6; cdG.visible = nid === 6; };

    // Input
    const keys = {};
    const onKD = (e) => {
      keys[e.key.toLowerCase()] = true;
      if (e.key === " ") e.preventDefault();
      // Dev mode: press 0-6 to jump to that quest
      if (e.key >= "0" && e.key <= "6") {
        const targetQ = parseInt(e.key);
        g.qid = targetQ; g.col = 0; g.fk = false; g.fq = false;
        setQuestId(targetQ); setCollected(0);
        spawnC(targetQ);
        // Handle quest-specific visibility
        shG.visible = targetQ === 6; cdG.visible = targetQ === 6;
        // If jumping to quest 1+, open inner door and switch to healed if needed
        if (targetQ >= 1 && innerDoorClosed) { innerDoorClosed = false; if (iDoor) iDoor.visible = false; }
        notify(`⚙️ Dev: Jumped to Quest ${targetQ} — ${QUESTS[targetQ].name}`, 3000);
      }
    };
    const onKU = (e) => { keys[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", onKD);
    window.addEventListener("keyup", onKU);

    // Game loop
    let running = true, lastTime = performance.now();
    const joy = joyRef.current;

    const loop = () => {
      if (!running) return;
      requestAnimationFrame(loop);
      const now = performance.now();
      let dt = (now - lastTime) / 1000; lastTime = now; dt = Math.min(dt, 0.05);
      ticks++;

      let mx = 0, mz = 0;
      if (keys["w"]||keys["arrowup"]) mz -= 1;
      if (keys["s"]||keys["arrowdown"]) mz += 1;
      if (keys["a"]||keys["arrowleft"]) mx -= 1;
      if (keys["d"]||keys["arrowright"]) mx += 1;
      if (joy.a) { mx += joy.dx; mz += joy.dy; }

      // Camera rotation with Q/E
      if (keys["q"]) camAngleRef.current += 2.5 * dt;
      if (keys["e"]) camAngleRef.current -= 2.5 * dt;

      if (mx || mz) {
        const len = Math.sqrt(mx*mx+mz*mz); mx /= len; mz /= len;
        const ca = camAngleRef.current;
        const sn = Math.sin(ca), cs = Math.cos(ca);
        const wmx = mx*cs - mz*sn, wmz = mx*sn + mz*cs;
        const nx = lu.x + wmx*5*dt, nz = lu.z + wmz*5*dt;
        if (!blocked(nx, nz)) { lu.x = nx; lu.z = nz; }
        else if (!blocked(nx, lu.z)) lu.x = nx;
        else if (!blocked(lu.x, nz)) lu.z = nz;
        lu.face = Math.atan2(wmx, wmz);
      }

      if ((jumpRef.current || keys[" "]) && lu.gnd) { lu.vy = 8; lu.gnd = false; }
      jumpRef.current = false;
      if (!lu.gnd) { lu.vy -= 22*dt; lu.y += lu.vy*dt; }
      const gy = terrainY(lu.x, lu.z) + 0.18;
      if (lu.y <= gy) { lu.y = gy; lu.vy = 0; lu.gnd = true; }
      if (lu.gnd && (mx||mz)) lu.y = gy + Math.sin(ticks*0.3)*0.05;

      luG.position.set(lu.x, lu.y, lu.z); luG.rotation.y = lu.face;

      const ca = camAngleRef.current;
      camera.position.lerp(new THREE.Vector3(lu.x+Math.sin(ca)*9, lu.y+(lu.gnd?7.5:5), lu.z+Math.cos(ca)*9), 0.08);
      camera.lookAt(lu.x, lu.y+1.5, lu.z);

      kBB.lookAt(camera.position); qBB.lookAt(camera.position);
      npcM.forEach(n => n.lookAt(camera.position));

      stG.position.x = 3+Math.sin(ticks*0.02)*5;
      stG.position.z = 3+Math.cos(ticks*0.015)*5;
      stG.position.y = terrainY(stG.position.x, stG.position.z)+2+Math.sin(ticks*0.05)*0.5;
      stOrb.material.opacity = 0.4+Math.sin(ticks*0.08)*0.2;

      parts.forEach((p,i) => {
        if (burn) { p.position.y = p.userData.bY+((ticks*p.userData.sp*0.02+p.userData.off)%4); p.material.opacity = 0.3+Math.sin(ticks*0.1+i)*0.3; }
        else { p.userData.a += p.userData.sp*dt; p.position.x = CX+Math.cos(p.userData.a)*p.userData.r; p.position.z = CZ+Math.sin(p.userData.a)*p.userData.r; p.position.y = p.userData.bY+Math.sin(ticks*0.05+i)*0.5; }
      });

      colls.forEach((c,i) => { if (!c.userData.col) { c.children[0].rotation.y += dt*2; c.children[0].position.y = Math.sin(ticks*0.05+i)*0.15; }});
      pathM.forEach((m,i) => { m.position.y = m.userData.bY+Math.sin(ticks*0.05+i*0.3)*0.15; m.material.opacity = 0.5+Math.sin(ticks*0.08+i*0.2)*0.3; });

      if (shG.visible && !shadowDead) {
        const pu = 1+Math.sin(ticks*0.05)*0.15; shS.scale.set(pu,pu,pu);
        shR.forEach((r,i) => { r.rotation.y += dt*(0.5+i*0.3); });
      }

      if (rcG.visible && !rcGO && Math.sqrt((lu.x-rcX2)**2+(lu.z-(rcZ2+17))**2) < 5) {
        rcGO = true; notify("The golden gates swing open! Welcome! 🌈👑", 5000);
      }
      if (rcGO) { gdL.position.x += (rcX2-3-gdL.position.x)*0.03; gdR.position.x += (rcX2+3-gdR.position.x)*0.03; }

      // Collect
      colls.forEach(c => {
        if (c.userData.col) return;
        const dx = lu.x-c.position.x, dz = lu.z-c.position.z, dy = lu.y-c.position.y;
        if (dx*dx+dy*dy+dz*dz < 1.8*1.8) {
          c.userData.col = true; c.visible = false;
          g.col++; g.sc += QUESTS[g.qid].spi;
          setCollected(g.col); setScore(g.sc);
          const q = QUESTS[g.qid];
          notify(`${q.label} ${g.col}/${q.goal}! +${q.spi} ⭐`);
          if (g.col >= q.goal) {
            if (g.qid === 0) { buildPath(); innerDoorClosed = false; if (iDoor) iDoor.visible = false; notify("All crystals! Find King & Queen! 👑", 5000); }
            else if (g.qid === 6) notify("All ingredients! Confront The Shadow! ⚔️", 5000);
            else notify("All collected! Return to castle! 🏰", 4000);
          }
        }
      });

      npcM.forEach(npc => {
        const dx = lu.x-npc.position.x, dz = lu.z-npc.position.z;
        if (dx*dx+dz*dz < 2.2*2.2 && ticks-npc.userData.lt > 420) {
          npc.userData.lt = ticks;
          const lines = burn ? DLG_B[npc.userData.t] : DLG_H[npc.userData.t];
          npc.userData.li++; g.sc += 5; setScore(g.sc);
          notify(`${npc.userData.e} ${npc.userData.n}: "${lines[npc.userData.li%lines.length]}"`, 4000);
        }
      });

      const sdx = lu.x-stG.position.x, sdz = lu.z-stG.position.z;
      if (sdx*sdx+sdz*sdz < 2.5*2.5 && ticks-lastHint > 130) { lastHint = ticks; notify(`💜 Stella: "${HINTS[ticks%HINTS.length]}"`, 4500); }

      const kD = (lu.x-(CX-1.5))**2 + (lu.z-(CZ-CH/2+2.2))**2;
      const qD = (lu.x-(CX+1.5))**2 + (lu.z-(CZ-CH/2+2.2))**2;
      if (g.qid === 0 && g.col >= 8) {
        if (kD < 6.25 && !g.fk) { g.fk = true; notify("🤴 Papa: 'Luna! You found us!'", 4000); }
        if (qD < 6.25 && !g.fq) { g.fq = true; notify("👸 Mama: 'My brave Luna!'", 4000); }
        if (g.fk && g.fq) setQuestScreen({emoji:"👑✨", pm:QUEST_MSGS[0].pm, nq:QUESTS[1].name, ni:QUEST_MSGS[0].ni, sc:g.sc});
      } else if (g.qid >= 1 && g.qid <= 5 && g.col >= QUESTS[g.qid].goal && (kD<6.25||qD<6.25)) {
        setQuestScreen({emoji:"🎉✨", pm:QUEST_MSGS[g.qid].pm, nq:QUESTS[g.qid+1].name, ni:QUEST_MSGS[g.qid].ni, sc:g.sc});
      }

      if (g.qid === 6 && g.col >= 3 && !shadowDead && lu.x**2+(lu.z+15)**2 < 9) {
        shadowDead = true; g.sc += 500; setScore(g.sc);
        notify("The Shadow vanishes! 🌈✨", 5000);
        let cnt = 0;
        const si = setInterval(() => {
          cnt++; const s = Math.max(0, 1-cnt/30); shG.scale.set(s,s,s);
          if (cnt >= 30) { clearInterval(si); shG.visible = false;
            rainbowVis = true; brG.visible = true; rcG.visible = true;
            setTimeout(() => setQuestScreen({emoji:"🌈👑", pm:QUEST_MSGS[6].pm, nq:QUESTS[1].name, ni:QUEST_MSGS[6].ni, sc:g.sc}), 2000);
          }
        }, 100);
      }

      if (rcG.visible) rcRooms.forEach(rm => {
        if (rv[rm.n]) return;
        if (Math.abs(lu.x-(rcX2+rm.p[0]))<3.5 && Math.abs(lu.z-(rcZ2+rm.p[1]))<3.5 && Math.abs(lu.y-rcY2)<2) {
          rv[rm.n] = true; g.sc += 25; setScore(g.sc); notify(`${rm.e} Welcome to ${rm.n}! +25 ⭐`);
        }
      });

      if (musicRef.current) {
        const onBr = rainbowVis && Math.abs(lu.x)<2.5 && lu.z<0 && lu.z>-65;
        const inRC = rainbowVis && Math.abs(lu.x)<15 && lu.z<-57 && lu.z>-93;
        const ct = musicRef.current.theme;
        if ((onBr||inRC) && ct !== "bright") { stopMu(); startMu("bright"); setMusicOn(true); notify("🌈 Rainbow music!"); }
        else if (!(onBr||inRC) && ct === "bright") { stopMu(); startMu("dark"); setMusicOn(true); notify("🌑 Back to kingdom…"); }
      }

      renderer.render(scene, camera);
    };
    requestAnimationFrame(loop);

    cleanRef.current = () => {
      running = false;
      window.removeEventListener("keydown", onKD); window.removeEventListener("keyup", onKU);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [notify, startMu, stopMu]);

  useEffect(() => {
    if (page !== "game") return;
    if (ref.current) buildGame(ref.current);
    return () => { if (cleanRef.current) cleanRef.current(); };
  }, [page, buildGame]);

  // ============ STORY ============
  if (page === "story") {
    const sl = SLIDES[slide];
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
        background:"linear-gradient(135deg,#070318,#1a0d3a 50%,#2d1060)",fontFamily:"system-ui,sans-serif",padding:20}}>
        <div style={{maxWidth:440,width:"100%",background:"rgba(30,10,60,0.85)",borderRadius:24,
          padding:"40px 32px",textAlign:"center",border:"2px solid rgba(168,85,247,0.3)",boxShadow:"0 0 40px rgba(168,85,247,0.15)"}}>
          <div style={{fontSize:64,marginBottom:16,lineHeight:1.2}}>{sl.emoji}</div>
          <h1 style={{color:"#e9d5ff",fontSize:28,margin:"0 0 16px",fontWeight:700}}>{sl.title}</h1>
          <p style={{color:"#c4b5d0",fontSize:17,lineHeight:1.6,margin:"0 0 32px"}}>{sl.text}</p>
          <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:24}}>
            {SLIDES.map((_,i)=><div key={i} style={{width:10,height:10,borderRadius:"50%",
              background:i===slide?"#a855f7":"rgba(168,85,247,0.3)"}}/>)}
          </div>
          <button onClick={()=>slide<3?setSlide(slide+1):setPage("game")}
            style={{background:"linear-gradient(135deg,#7c3aed,#a855f7)",color:"white",border:"none",
              borderRadius:16,padding:"14px 36px",fontSize:18,fontWeight:600,cursor:"pointer",
              boxShadow:"0 4px 15px rgba(168,85,247,0.4)"}}>
            {slide<3?"Next →":"🐱 Start Adventure!"}</button>
        </div>
      </div>
    );
  }

  // ============ GAME UI ============
  const q = QUESTS[questId];
  const statusText = collected >= q.goal ? (questId===0?"Find King & Queen!":questId===6?"Confront Shadow!":"Return to castle!") : q.name;

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",
      background:"#070318",fontFamily:"system-ui,sans-serif",padding:8,position:"relative"}}>

      <button onClick={toggleMu} style={{position:"fixed",top:8,right:8,zIndex:100,
        background:"rgba(30,10,60,0.9)",border:"1px solid rgba(168,85,247,0.4)",borderRadius:12,
        padding:"8px 14px",color:"#e9d5ff",fontSize:14,cursor:"pointer"}}>
        {musicOn?"🎵 On":"🔇 Off"}</button>

      <div style={{display:"flex",gap:8,marginBottom:4,flexWrap:"wrap",justifyContent:"center"}}>
        {[`${q.label} ${collected}/${q.goal}`, `⭐ ${score}`, `🗺️ ${statusText}`].map((t,i)=>
          <div key={i} style={{background:"rgba(30,10,60,0.9)",border:"1px solid rgba(168,85,247,0.3)",
            borderRadius:20,padding:"6px 16px",color:"#e9d5ff",fontSize:14,fontWeight:500}}>{t}</div>
        )}
      </div>
      <div style={{color:"#6a5090",fontSize:11,marginBottom:4,textAlign:"center"}}>
        WASD move · Q/E rotate camera · Space jump · 0-6 jump to quest
      </div>

      <div ref={ref} style={{width:"100%",maxWidth:520,position:"relative"}}>
        <div style={{position:"absolute",bottom:10,left:10,width:120,height:120,borderRadius:"50%",
          background:"rgba(168,85,247,0.15)",border:"2px solid rgba(168,85,247,0.3)",touchAction:"none",zIndex:10}}
          onPointerDown={e=>{e.preventDefault();e.target.setPointerCapture(e.pointerId);
            const r=e.currentTarget.getBoundingClientRect();const jr=joyRef.current;jr.a=true;
            const mv=ev=>{jr.dx=Math.max(-1,Math.min(1,(ev.clientX-r.left-60)/48));jr.dy=Math.max(-1,Math.min(1,(ev.clientY-r.top-60)/48));};
            const up=()=>{jr.a=false;jr.dx=0;jr.dy=0;window.removeEventListener("pointermove",mv);window.removeEventListener("pointerup",up);};
            window.addEventListener("pointermove",mv);window.addEventListener("pointerup",up);}}>
          <div style={{width:36,height:36,borderRadius:"50%",background:"rgba(168,85,247,0.4)",
            position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)"}}/>
        </div>

        <div style={{position:"absolute",bottom:10,right:10,width:70,height:70,borderRadius:"50%",
          background:"rgba(168,85,247,0.2)",border:"2px solid rgba(168,85,247,0.4)",
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,touchAction:"none",
          zIndex:10,cursor:"pointer",userSelect:"none"}}
          onPointerDown={e=>{e.preventDefault();jumpRef.current=true;}}>🐱</div>

        <div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",
          width:180,height:50,touchAction:"none",zIndex:5,opacity:0}}
          onPointerDown={e=>{e.preventDefault();e.target.setPointerCapture(e.pointerId);
            let lx=e.clientX;
            const mv=ev=>{camAngleRef.current += -(ev.clientX-lx)*0.01;lx=ev.clientX;};
            const up=()=>{window.removeEventListener("pointermove",mv);window.removeEventListener("pointerup",up);};
            window.addEventListener("pointermove",mv);window.addEventListener("pointerup",up);}}/>
      </div>

      {notif && <div style={{position:"fixed",bottom:80,left:"50%",transform:"translateX(-50%)",
        background:"rgba(30,10,60,0.95)",border:"1px solid rgba(168,85,247,0.4)",borderRadius:20,
        padding:"10px 24px",color:"#e9d5ff",fontSize:14,maxWidth:400,textAlign:"center",zIndex:50,
        boxShadow:"0 4px 20px rgba(168,85,247,0.3)"}}>{notif}</div>}

      {questScreen && <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,
        background:"rgba(7,3,24,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}>
        <div style={{maxWidth:420,width:"90%",background:"rgba(30,10,60,0.95)",borderRadius:24,
          padding:"36px 28px",textAlign:"center",border:"2px solid rgba(168,85,247,0.4)"}}>
          <div style={{fontSize:56,marginBottom:12}}>{questScreen.emoji}</div>
          <h2 style={{color:"#e9d5ff",fontSize:22,margin:"0 0 12px"}}>Quest Complete!</h2>
          <p style={{color:"#c084fc",fontSize:16,margin:"0 0 16px",fontStyle:"italic"}}>"{questScreen.pm}"</p>
          <div style={{background:"rgba(168,85,247,0.15)",borderRadius:12,padding:"12px 16px",margin:"0 0 16px"}}>
            <p style={{color:"#fbbf24",fontSize:14,margin:"0 0 8px",fontWeight:600}}>Next: {questScreen.nq}</p>
            <p style={{color:"#c4b5d0",fontSize:13,margin:0}}>{questScreen.ni}</p></div>
          <p style={{color:"#fbbf24",fontSize:18,margin:"0 0 20px"}}>⭐ Score: {questScreen.sc}</p>
          <button onClick={startNextQuestReact}
            style={{background:"linear-gradient(135deg,#7c3aed,#a855f7)",color:"white",border:"none",
              borderRadius:16,padding:"14px 32px",fontSize:17,fontWeight:600,cursor:"pointer"}}>
            Start {questScreen.nq}! 🚀</button>
        </div>
      </div>}
    </div>
  );
}
