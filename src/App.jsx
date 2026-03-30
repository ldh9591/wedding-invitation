import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";

/* ═══════════════════════════════════════════
   CONFIG — 이 객체만 수정하면 청첩장 내용이 바뀜
   ═══════════════════════════════════════════ */
const config = {
  intro: {
    type: "door", // 'door' | 'fade' | 'slide'
    title: "우리 결혼합니다",
    subtitle: "2026. 10. 10 토요일 오후 2시",
  },
  groom: {
    lastName: "임", firstName: "돈혁", relation: "차남",
    father: "임승빈", mother: "박미화", phone: "010-2806-2793",
    accounts: [{ bank: "하나은행", number: "72591052485707", holder: "임돈혁" }],
    parentAccounts: [],
  },
  bride: {
    lastName: "이", firstName: "다영", relation: "장녀",
    father: "이주린", mother: "이은아", phone: "010-8597-5426",
    accounts: [{ bank: "국민은행", number: "98597542653", holder: "이다영" }],
    parentAccounts: [],
  },
  wedding: {
    date: "2026-10-10T14:00:00",
    location: "더채플앳청담", address: "서울 강남구 청담동 123-45",
    floor: "3층 그랜드볼룸", phone: "02-1234-5678",
  },
  greeting: {
    title: "소중한 분들을 초대합니다",
    message: "서로 다른 길을 걸어온 두 사람이\n이제 같은 길을 함께 걸어가려 합니다.\n\n저희의 새로운 시작을\n함께 축복해 주시면 감사하겠습니다.",
  },
  // ── 대표 사진 (public/images/ 안에 넣고 경로 입력) ──
  mainPhoto: "/images/photo1.jpg",
  gallery: { images: ["/images/photo1.jpg",
    "/images/photo2.jpg",
    "/images/photo3.jpg",
    "/images/photo4.jpg",
    "/images/photo5.jpg",
    "/images/photo6.jpg",
    "/images/photo7.jpg",
    "/images/photo8.jpg",
    "/images/photo9.jpg",
    "/images/photo10.jpg",
    "/images/photo11.jpg",
    "/images/photo12.jpg",
    "/images/photo13.jpg",
    "/images/photo14.jpg",
    "/images/photo15.jpg",] },
  map: { lat: 37.5245, lng: 127.0467, kakaoMapUrl: "", naverMapUrl: "", tmapUrl: "" },
  transport: { subway: "청담역 (7호선) 1번 출구 도보 5분", bus: "청담사거리 정류장 하차", parking: "건물 지하 주차장 이용 가능 (2시간 무료)" },
  // ── BGM ──
  // 배포 시: public/bgm.mp3 에 파일을 넣고 src: "/bgm.mp3" 로 설정
  // 개발 미리보기에서는 src: "" (빈 문자열)으로 두면 데모 모드 동작
  bgm: { src: "/bgm.mp3", autoPlay: true },

  // ── 하객 사진 전송 (Photo Drop) ──
  // gasUrl: Google Apps Script 웹앱 배포 URL (비어있으면 섹션 숨김)
  // maxFileSizeMB: 개별 파일 최대 용량 (MB)
  photoDrop: {
    enabled: true,
    gasUrl: "https://script.google.com/macros/s/AKfycbyguXhmuSsmXn8u7nEu71I_IvxfsskWSzgHtndXIssdiE24JDHDt_P0HdlP79gZUh2yHA/exec",
    maxFileSizeMB: 50,
    acceptTypes: "image/*,video/*",
  },
  // ── 방명록 (GAS + Google Sheets) ──
  // gasUrl: 방명록 GAS 웹앱 배포 URL (비어있으면 로컬 데모 모드)
  guestbook: {
    enabled: true,
    gasUrl: "https://script.google.com/macros/s/AKfycbx0FM0TKYbdEaWwie8zguwWA5fxWjWTJkdrP6RnaJHM_9rFe0rgilJc-ENXehJPaW41cQ/exec",
  },
  theme: {
    primaryColor: "#8B7355", accentColor: "#C9A96E",
    fontFamily: "'Noto Serif KR', serif",
    backgroundColor: "#FAF8F4", textColor: "#3D3529", lightText: "#8C8070",
  },
};

/* ═══════════════════════════════════════════
   클립보드 복사 유틸리티 — 카카오톡 인앱 브라우저 대응
   1차: navigator.clipboard.writeText (HTTPS 환경)
   2차: document.execCommand('copy') (HTTP/WebView Fallback)
   ═══════════════════════════════════════════ */
async function copyToClipboard(text) {
  // 1차 시도: 최신 Clipboard API
  if (navigator.clipboard && window.isSecureContext) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* fallback */ }
  }
  // 2차 시도: execCommand fallback (카카오톡 인앱, HTTP 등)
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0";
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (e) { return false; }
}

/* ═══════════════════════════════════════════
   Toast 팝업 — 하단 중앙, 자동 사라짐
   ═══════════════════════════════════════════ */
function Toast({ message }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{
            position: "fixed", bottom: "80px", left: "50%", transform: "translateX(-50%)",
            zIndex: 400, background: "rgba(45,38,30,0.92)", color: "#fff",
            padding: "12px 28px", borderRadius: "24px", fontSize: "13px",
            fontFamily: config.theme.fontFamily, fontWeight: 300,
            boxShadow: "0 4px 16px rgba(0,0,0,0.18)", letterSpacing: "0.5px",
            whiteSpace: "nowrap", pointerEvents: "none",
          }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════ */
function ScrollFadeIn({ children, delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 36 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 36 }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 0", color: config.theme.accentColor, opacity: 0.35 }}>
      <div style={{ width: "28px", height: "0.5px", background: config.theme.accentColor }} />
      <span style={{ margin: "0 12px", fontSize: "8px", letterSpacing: "4px" }}>✦</span>
      <div style={{ width: "28px", height: "0.5px", background: config.theme.accentColor }} />
    </div>
  );
}

/* ═══════════════════════════════════════════
   인트로 #1: Door — 터치하면 열림
   ═══════════════════════════════════════════ */
function DoorIntro({ onComplete }) {
  const [phase, setPhase] = useState("closed");
  const handleOpen = useCallback(() => {
    if (phase !== "closed") return;
    setPhase("opening");
    setTimeout(() => onComplete(), 1500);
  }, [phase, onComplete]);

  return (
    <motion.div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <motion.div animate={{ x: phase === "opening" ? "-100%" : "0%" }} transition={{ duration: 1.4, ease: [0.76, 0, 0.24, 1] }}
        style={{ position: "absolute", top: 0, left: 0, width: "50%", height: "100%", background: "linear-gradient(135deg, #3D3529 0%, #5C4F3C 100%)", borderRight: `1px solid ${config.theme.accentColor}30` }}>
        <div style={{ position: "absolute", top: "15%", bottom: "15%", left: "20%", right: "8px", border: `0.5px solid ${config.theme.accentColor}20`, borderRadius: "2px" }} />
      </motion.div>
      <motion.div animate={{ x: phase === "opening" ? "100%" : "0%" }} transition={{ duration: 1.4, ease: [0.76, 0, 0.24, 1] }}
        style={{ position: "absolute", top: 0, right: 0, width: "50%", height: "100%", background: "linear-gradient(225deg, #3D3529 0%, #5C4F3C 100%)", borderLeft: `1px solid ${config.theme.accentColor}30` }}>
        <div style={{ position: "absolute", top: "15%", bottom: "15%", right: "20%", left: "8px", border: `0.5px solid ${config.theme.accentColor}20`, borderRadius: "2px" }} />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: phase === "closed" ? 1 : 0 }} transition={{ duration: 0.6, delay: 0.3 }}
        style={{ zIndex: 101, textAlign: "center", padding: "0 40px" }}>
        <p style={{ fontSize: "10px", letterSpacing: "8px", marginBottom: "20px", fontFamily: config.theme.fontFamily, color: config.theme.accentColor, fontWeight: 300 }}>WEDDING INVITATION</p>
        <p style={{ fontSize: "22px", fontFamily: config.theme.fontFamily, fontWeight: 300, lineHeight: 1.7, color: "#FAF8F4" }}>{config.intro.title}</p>
        <p style={{ fontSize: "12px", marginTop: "12px", color: "#B0A898", letterSpacing: "1.5px", fontFamily: config.theme.fontFamily, fontWeight: 300 }}>{config.intro.subtitle}</p>
        <motion.button onClick={handleOpen} whileTap={{ scale: 0.95 }} animate={{ y: [0, 4, 0] }}
          transition={{ y: { repeat: Infinity, duration: 2, ease: "easeInOut" } }}
          style={{ marginTop: "40px", padding: "12px 36px", background: "transparent", border: `1px solid ${config.theme.accentColor}60`, borderRadius: "24px", cursor: "pointer", color: config.theme.accentColor, fontSize: "12px", fontFamily: config.theme.fontFamily, letterSpacing: "3px", fontWeight: 300 }}>
          청첩장 열기
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

function FadeIntro({ onComplete }) {
  const [ready, setReady] = useState(false);
  const handleOpen = () => { if (ready) return; setReady(true); setTimeout(() => onComplete(), 1300); };
  return (
    <motion.div animate={{ opacity: ready ? 0 : 1 }} transition={{ duration: 1.2, ease: "easeInOut" }}
      style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: config.theme.backgroundColor }}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} style={{ textAlign: "center" }}>
        <motion.div initial={{ width: 0 }} animate={{ width: "50px" }} transition={{ duration: 0.8, delay: 0.2 }} style={{ height: "0.5px", background: config.theme.accentColor, margin: "0 auto 24px" }} />
        <p style={{ fontSize: "10px", letterSpacing: "8px", color: config.theme.lightText, fontFamily: config.theme.fontFamily, fontWeight: 300 }}>INVITATION</p>
        <p style={{ fontSize: "24px", fontFamily: config.theme.fontFamily, fontWeight: 300, color: config.theme.textColor, marginTop: "20px", lineHeight: 1.6 }}>
          {config.groom.firstName}<span style={{ display: "inline-block", margin: "0 14px", fontSize: "12px", color: config.theme.accentColor, verticalAlign: "middle" }}>♥</span>{config.bride.firstName}
        </p>
        <motion.div initial={{ width: 0 }} animate={{ width: "50px" }} transition={{ duration: 0.8, delay: 0.4 }} style={{ height: "0.5px", background: config.theme.accentColor, margin: "24px auto 0" }} />
        <motion.button onClick={handleOpen} whileTap={{ scale: 0.95 }} animate={{ y: [0, 4, 0] }} transition={{ y: { repeat: Infinity, duration: 2, ease: "easeInOut" } }}
          style={{ marginTop: "48px", padding: "12px 36px", background: "transparent", border: `1px solid ${config.theme.accentColor}50`, borderRadius: "24px", cursor: "pointer", color: config.theme.accentColor, fontSize: "12px", fontFamily: config.theme.fontFamily, letterSpacing: "3px", fontWeight: 300 }}>
          청첩장 열기
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

function SlideIntro({ onComplete }) {
  const [opening, setOpening] = useState(false);
  const handleOpen = () => { if (opening) return; setOpening(true); setTimeout(() => onComplete(), 1400); };
  return (
    <motion.div animate={{ y: opening ? "-100%" : "0%" }} transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
      style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg, #3D3529 0%, #5C4F3C 70%, #6B5D4B 100%)" }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }} style={{ textAlign: "center" }}>
        <p style={{ fontSize: "10px", letterSpacing: "8px", color: config.theme.accentColor, fontFamily: config.theme.fontFamily, marginBottom: "28px", fontWeight: 300 }}>WEDDING</p>
        <p style={{ fontSize: "20px", fontFamily: config.theme.fontFamily, color: "#FAF8F4", lineHeight: 1.8, fontWeight: 300 }}>
          {config.groom.lastName}{config.groom.firstName}<span style={{ display: "inline-block", margin: "0 12px", fontSize: "11px", color: config.theme.accentColor }}>·</span>{config.bride.lastName}{config.bride.firstName}
        </p>
        <p style={{ fontSize: "12px", color: "#B0A898", marginTop: "12px", letterSpacing: "1.5px", fontWeight: 300 }}>{config.intro.subtitle}</p>
        <motion.button onClick={handleOpen} whileTap={{ scale: 0.95 }} animate={{ y: [0, 4, 0] }} transition={{ y: { repeat: Infinity, duration: 2, ease: "easeInOut" } }}
          style={{ marginTop: "48px", padding: "12px 36px", background: "transparent", border: `1px solid ${config.theme.accentColor}50`, borderRadius: "24px", cursor: "pointer", color: config.theme.accentColor, fontSize: "12px", fontFamily: config.theme.fontFamily, letterSpacing: "3px", fontWeight: 300 }}>
          청첩장 열기
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

function IntroRouter({ onComplete }) {
  const C = { door: DoorIntro, fade: FadeIntro, slide: SlideIntro }[config.intro.type] || DoorIntro;
  return <C onComplete={onComplete} />;
}

/* ═══════════════════════════════════════════ */
function MainPhoto() {
  const { groom, bride, wedding } = config;
  const wd = new Date(wedding.date);
  const wk = ["일","월","화","수","목","금","토"];
  const h = wd.getHours();
  const timeStr = h >= 12 ? `오후 ${h - 12 === 0 ? 12 : h - 12}시` : `오전 ${h}시`;
  return (
    <section style={{ padding: "56px 28px 44px", textAlign: "center" }}>
      {config.mainPhoto ? (
        <img src={config.mainPhoto} alt="대표 사진" style={{ width: "100%", maxWidth: "320px", aspectRatio: "3/4", margin: "0 auto 40px", borderRadius: "6px", objectFit: "cover", display: "block" }} />
      ) : (
        <div style={{ width: "100%", maxWidth: "320px", aspectRatio: "3/4", margin: "0 auto 40px", background: `linear-gradient(160deg, ${config.theme.accentColor}12, ${config.theme.accentColor}06)`, border: `0.5px solid ${config.theme.accentColor}25`, borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: config.theme.lightText, fontSize: "13px", fontFamily: config.theme.fontFamily, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: "16px", border: `0.5px solid ${config.theme.accentColor}15`, borderRadius: "4px" }} />
          <span style={{ position: "relative", opacity: 0.6 }}>대표 사진</span>
        </div>
      )}
      <p style={{ fontSize: "11px", letterSpacing: "6px", color: config.theme.accentColor, fontFamily: config.theme.fontFamily, marginBottom: "16px", fontWeight: 300 }}>WEDDING DAY</p>
      <p style={{ fontSize: "24px", fontFamily: config.theme.fontFamily, color: config.theme.textColor, fontWeight: 300, letterSpacing: "3px" }}>
        {groom.lastName}{groom.firstName}<span style={{ display: "inline-block", margin: "0 16px", fontSize: "12px", color: config.theme.accentColor, verticalAlign: "middle" }}>♥</span>{bride.lastName}{bride.firstName}
      </p>
      <div style={{ width: "24px", height: "0.5px", background: config.theme.accentColor, opacity: 0.4, margin: "20px auto" }} />
      <p style={{ fontSize: "13px", color: config.theme.lightText, lineHeight: 2, fontFamily: config.theme.fontFamily, letterSpacing: "0.5px", fontWeight: 300 }}>
        {wd.getFullYear()}년 {wd.getMonth()+1}월 {wd.getDate()}일 {wk[wd.getDay()]}요일<br />{timeStr}<br />{wedding.location} {wedding.floor}
      </p>
    </section>
  );
}

function Greeting() {
  return (
    <section style={{ padding: "44px 36px", textAlign: "center" }}>
      <p style={{ fontSize: "11px", letterSpacing: "6px", color: config.theme.accentColor, fontFamily: config.theme.fontFamily, marginBottom: "28px", fontWeight: 300 }}>INVITATION</p>
      <p style={{ fontSize: "15px", fontFamily: config.theme.fontFamily, color: config.theme.textColor, lineHeight: 2.4, whiteSpace: "pre-line", fontWeight: 300 }}>{config.greeting.message}</p>
      <div style={{ width: "24px", height: "0.5px", background: config.theme.accentColor, opacity: 0.3, margin: "32px auto" }} />
      <div style={{ fontFamily: config.theme.fontFamily }}>
        {[{ p: config.groom }, { p: config.bride }].map(({ p }) => (
          <p key={p.firstName} style={{ fontSize: "13px", color: config.theme.textColor, lineHeight: 2.2, fontWeight: 300 }}>
            {p.father}<span style={{ color: config.theme.lightText, fontSize: "11px" }}> · </span>{p.mother}
            <span style={{ color: config.theme.lightText, fontSize: "11px", margin: "0 4px" }}>의</span>
            <span style={{ color: config.theme.lightText, fontSize: "11px" }}>{p.relation}</span>{" "}
            <span style={{ fontWeight: 400 }}>{p.firstName}</span>
          </p>
        ))}
      </div>
    </section>
  );
}

function Calendar() {
  const wd = new Date(config.wedding.date);
  const [y, m, d] = [wd.getFullYear(), wd.getMonth(), wd.getDate()];
  const h = wd.getHours();
  const timeStr = h >= 12 ? `오후 ${h-12===0?12:h-12}시` : `오전 ${h}시`;
  const fd = new Date(y, m, 1).getDay();
  const ld = new Date(y, m+1, 0).getDate();
  const weeks = []; let c = 1 - fd;
  for (let w=0;w<6;w++){const wk=[];for(let i=0;i<7;i++){wk.push(c>0&&c<=ld?c:null);c++;}if(wk.some(v=>v!==null))weeks.push(wk);}
  const today=new Date();today.setHours(0,0,0,0);
  const diff=Math.ceil((new Date(y,m,d)-today)/86400000);

  return (
    <section style={{ padding: "44px 24px", textAlign: "center" }}>
      <p style={{ fontSize: "17px", fontFamily: config.theme.fontFamily, color: config.theme.textColor, marginBottom: "6px", fontWeight: 400 }}>{y}년 {m+1}월</p>
      <p style={{ fontSize: "12px", color: config.theme.lightText, fontFamily: config.theme.fontFamily, marginBottom: "20px", fontWeight: 300 }}>{d}일 · {timeStr}</p>
      <div style={{ maxWidth: "300px", margin: "0 auto", fontFamily: config.theme.fontFamily }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: "6px" }}>
          {["일","월","화","수","목","금","토"].map((v,i)=>(
            <div key={v} style={{ fontSize: "11px", padding: "6px 0", fontWeight: 300, color: i===0?"#C27070":i===6?"#6080A0":config.theme.lightText }}>{v}</div>
          ))}
        </div>
        {weeks.map((wk,wi)=>(
          <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
            {wk.map((dt,di)=>{const isW=dt===d;return(
              <div key={di} style={{ padding: "7px 0", fontSize: "13px", fontWeight: isW?400:300, color: !dt?"transparent":isW?"#fff":di===0?"#C27070":di===6?"#6080A0":config.theme.textColor, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {isW&&<div style={{ position: "absolute", width: "30px", height: "30px", borderRadius: "50%", background: config.theme.accentColor }} />}
                <span style={{ position: "relative", zIndex: 1 }}>{dt}</span>
              </div>
            );})}
          </div>
        ))}
      </div>
      <p style={{ marginTop: "20px", fontSize: "12px", color: config.theme.lightText, letterSpacing: "1.5px", fontFamily: config.theme.fontFamily, fontWeight: 300 }}>
        {diff>0?`결혼식까지 D-${diff}`:diff===0?"오늘이 결혼식입니다 ♥":""}
      </p>
    </section>
  );
}

/* ═══════════════════════════════════════════
   갤러리
   ═══════════════════════════════════════════ */
function Gallery() {
  const [sel, setSel] = useState(null);
  const [ts, setTs] = useState(null);
  const [td, setTd] = useState(0);
  const [drag, setDrag] = useState(false);
  const samples = ["linear-gradient(135deg,#E8D5B7,#B08968)","linear-gradient(135deg,#D4C5A9,#8B7355)","linear-gradient(135deg,#C9A96E,#7A6840)","linear-gradient(135deg,#E0D2BE,#A08060)","linear-gradient(135deg,#D6C8B4,#9A8570)","linear-gradient(135deg,#CABBA5,#8C7D65)","linear-gradient(135deg,#E5D8C4,#A59070)","linear-gradient(135deg,#DDD0BC,#958060)","linear-gradient(135deg,#D2C4B0,#887558)"];
  const imgs = config.gallery.images.length>0?config.gallery.images:samples;
  const real = config.gallery.images.length>0;
  const go = (i) => { if(i<0)i=imgs.length-1;if(i>=imgs.length)i=0;setSel(i); };
  const onTS=(e)=>{setTs(e.touches[0].clientX);setDrag(true);setTd(0);};
  const onTM=(e)=>{if(ts!==null)setTd(e.touches[0].clientX-ts);};
  const onTE=()=>{setDrag(false);if(Math.abs(td)>60){td>0?go(sel-1):go(sel+1);}setTs(null);setTd(0);};
  const gs=(i)=>i===0?{gridColumn:"1/3",gridRow:"1/3",aspectRatio:"1"}:{aspectRatio:"1"};
  const ri=(img,i,full)=>real
    ?<img src={img} alt="" style={{width:"100%",height:"100%",objectFit:full?"contain":"cover",display:"block",userSelect:"none",pointerEvents:"none"}} loading="lazy"/>
    :<div style={{width:"100%",height:"100%",minHeight:full?"auto":"100px",background:img,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:full?"24px":"13px",fontFamily:config.theme.fontFamily,opacity:0.85}}>{i+1}</div>;

  return (
    <section style={{ padding: "44px 24px", textAlign: "center" }}>
      <p style={{ fontSize: "11px", letterSpacing: "6px", color: config.theme.accentColor, fontFamily: config.theme.fontFamily, marginBottom: "8px", fontWeight: 300 }}>GALLERY</p>
      <p style={{ fontSize: "13px", color: config.theme.lightText, fontFamily: config.theme.fontFamily, marginBottom: "24px", fontWeight: 300 }}>우리의 소중한 순간들</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "3px", maxWidth: "380px", margin: "0 auto" }}>
        {imgs.map((img,i)=>(
          <motion.div key={i} whileTap={{scale:0.97}} onClick={()=>setSel(i)} style={{...gs(i),borderRadius:"2px",overflow:"hidden",cursor:"pointer"}}>{ri(img,i,false)}</motion.div>
        ))}
      </div>
      <AnimatePresence>
        {sel!==null&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.2}} onClick={()=>setSel(null)}
            style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.94)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <button onClick={()=>setSel(null)} style={{position:"absolute",top:"16px",right:"16px",zIndex:301,background:"none",border:"none",color:"rgba(255,255,255,0.7)",fontSize:"24px",cursor:"pointer",padding:"8px"}}>✕</button>
            <p style={{position:"absolute",top:"22px",left:"50%",transform:"translateX(-50%)",color:"rgba(255,255,255,0.5)",fontSize:"12px",fontFamily:config.theme.fontFamily,letterSpacing:"2px"}}>{sel+1} / {imgs.length}</p>
            <motion.div onClick={e=>e.stopPropagation()} onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}
              animate={{x:drag?td:0}} transition={drag?{duration:0}:{type:"spring",stiffness:300,damping:30}}
              style={{width:"100%",maxWidth:"430px",height:"60vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",boxSizing:"border-box",touchAction:"pan-y"}}>
              <motion.div key={sel} initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} transition={{duration:0.2}} style={{width:"100%",height:"100%",borderRadius:"4px",overflow:"hidden"}}>{ri(imgs[sel],sel,true)}</motion.div>
            </motion.div>
            <button onClick={e=>{e.stopPropagation();go(sel-1);}} style={{position:"absolute",left:"8px",top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,0.08)",border:"none",color:"#fff",fontSize:"18px",cursor:"pointer",padding:"12px 14px",borderRadius:"50%"}}>‹</button>
            <button onClick={e=>{e.stopPropagation();go(sel+1);}} style={{position:"absolute",right:"8px",top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,0.08)",border:"none",color:"#fff",fontSize:"18px",cursor:"pointer",padding:"12px 14px",borderRadius:"50%"}}>›</button>
            <div onClick={e=>e.stopPropagation()} style={{position:"absolute",bottom:"24px",display:"flex",gap:"5px",padding:"0 20px",overflowX:"auto",maxWidth:"100%"}}>
              {imgs.map((img,i)=>(
                <div key={i} onClick={()=>setSel(i)} style={{width:"40px",height:"40px",minWidth:"40px",borderRadius:"3px",overflow:"hidden",cursor:"pointer",border:i===sel?"2px solid #fff":"2px solid transparent",opacity:i===sel?1:0.4,transition:"all 0.2s"}}>
                  {real?<img src={img} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{width:"100%",height:"100%",background:img}}/>}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ═══════════════════════════════════════════
   하객 사진 전송 (Photo Drop)
   — GAS를 통해 구글 드라이브에 순차 업로드
   ═══════════════════════════════════════════ */
function PhotoDrop({ showToast }) {
  const [guestName, setGuestName] = useState("");
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef(null);

  // gasUrl 없으면 렌더링 안 함
  if (!config.photoDrop.enabled || !config.photoDrop.gasUrl) return null;

  const maxBytes = config.photoDrop.maxFileSizeMB * 1024 * 1024;

  // 파일 선택 핸들러 — 용량 검증 포함
  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    const valid = [];
    let rejected = 0;

    selected.forEach((f) => {
      if (f.size > maxBytes) {
        rejected++;
      } else {
        valid.push(f);
      }
    });

    if (rejected > 0) {
      showToast(`${config.photoDrop.maxFileSizeMB}MB 이하의 파일만 가능합니다 (${rejected}개 제외됨)`);
    }

    setFiles((prev) => [...prev, ...valid]);
    // input 리셋 (같은 파일 재선택 가능하도록)
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 파일 목록에서 개별 제거
  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // 파일 → Base64 변환
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 순차 업로드 (for...of)
  const handleUpload = async () => {
    if (!guestName.trim()) { showToast("이름을 입력해주세요"); return; }
    if (files.length === 0) { showToast("전송할 파일을 선택해주세요"); return; }

    setUploading(true);
    const total = files.length;
    let successCount = 0;
    let failCount = 0;

    for (const [idx, file] of files.entries()) {
      setProgress({ current: idx + 1, total });
      showToast(`사진을 전송 중입니다 (${idx + 1}/${total})`);

      try {
        const base64 = await fileToBase64(file);
        const ext = file.name.split(".").pop();
        const safeName = guestName.trim().replace(/[^a-zA-Z0-9가-힣]/g, "_");
        const fileName = `${safeName}_${file.name}`;

        const res = await fetch(config.photoDrop.gasUrl, {
          method: "POST",
          body: JSON.stringify({
            base64,
            fileName,
            mimeType: file.type || `image/${ext}`,
          }),
        });

        const result = await res.json();
        if (result.success) { successCount++; }
        else { failCount++; }
      } catch (err) {
        failCount++;
      }
    }

    // 완료 처리
    setUploading(false);
    setProgress({ current: 0, total: 0 });
    setFiles([]);
    setGuestName("");
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (failCount === 0) {
      showToast(`${successCount}장의 사진이 전송되었습니다 ♥`);
    } else {
      showToast(`${successCount}장 전송 완료, ${failCount}장 실패`);
    }
  };

  // 파일 크기 표시 (KB/MB)
  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const inputStyle = {
    width: "100%", padding: "11px 14px",
    border: `1px solid ${config.theme.accentColor}25`, borderRadius: "6px",
    fontFamily: config.theme.fontFamily, fontSize: "13px",
    background: "#fff", color: config.theme.textColor,
    outline: "none", boxSizing: "border-box", fontWeight: 300,
  };

  return (
    <section style={{ padding: "44px 24px", textAlign: "center" }}>
      <p style={{ fontSize: "11px", letterSpacing: "6px", color: config.theme.accentColor, fontFamily: config.theme.fontFamily, marginBottom: "8px", fontWeight: 300 }}>
        PHOTO DROP
      </p>
      <p style={{ fontSize: "13px", color: config.theme.lightText, fontFamily: config.theme.fontFamily, marginBottom: "24px", fontWeight: 300 }}>
        축하의 순간을 함께 나눠주세요
      </p>

      <div style={{ maxWidth: "360px", margin: "0 auto", textAlign: "left" }}>
        {/* 이름 입력 */}
        <input
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="보내시는 분 이름"
          maxLength={20}
          disabled={uploading}
          style={{ ...inputStyle, marginBottom: "10px" }}
        />

        {/* 파일 선택 버튼 */}
        <input
          ref={fileInputRef}
          type="file"
          accept={config.photoDrop.acceptTypes}
          multiple
          onChange={handleFileSelect}
          disabled={uploading}
          style={{ display: "none" }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            width: "100%", padding: "14px",
            background: `${config.theme.accentColor}08`,
            border: `1.5px dashed ${config.theme.accentColor}40`,
            borderRadius: "8px", cursor: uploading ? "default" : "pointer",
            fontFamily: config.theme.fontFamily, fontSize: "13px",
            color: config.theme.lightText, fontWeight: 300,
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            opacity: uploading ? 0.5 : 1,
          }}
        >
          <span style={{ fontSize: "18px" }}>📷</span>
          사진 또는 영상 선택하기
        </button>

        {/* 선택된 파일 목록 */}
        {files.length > 0 && (
          <div style={{ marginTop: "12px" }}>
            <p style={{ fontSize: "11px", color: config.theme.lightText, marginBottom: "8px", fontWeight: 300 }}>
              {files.length}개 파일 선택됨
            </p>
            {files.map((file, idx) => (
              <div key={`${file.name}-${idx}`} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 10px", marginBottom: "4px",
                background: `${config.theme.accentColor}06`, borderRadius: "6px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: "14px", flexShrink: 0 }}>
                    {file.type.startsWith("video") ? "🎬" : "🖼"}
                  </span>
                  <span style={{
                    fontSize: "12px", color: config.theme.textColor,
                    fontFamily: config.theme.fontFamily, fontWeight: 300,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {file.name}
                  </span>
                  <span style={{ fontSize: "10px", color: config.theme.lightText, flexShrink: 0 }}>
                    {formatSize(file.size)}
                  </span>
                </div>
                {!uploading && (
                  <button onClick={() => removeFile(idx)} style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: `${config.theme.lightText}80`, fontSize: "14px",
                    padding: "2px 6px", flexShrink: 0,
                  }}>✕</button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 업로드 진행 바 */}
        {uploading && progress.total > 0 && (
          <div style={{ marginTop: "12px" }}>
            <div style={{
              width: "100%", height: "4px", background: `${config.theme.accentColor}15`,
              borderRadius: "2px", overflow: "hidden",
            }}>
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                transition={{ duration: 0.3 }}
                style={{ height: "100%", background: config.theme.accentColor, borderRadius: "2px" }}
              />
            </div>
            <p style={{ fontSize: "11px", color: config.theme.lightText, marginTop: "6px", textAlign: "center", fontWeight: 300 }}>
              {progress.current} / {progress.total}
            </p>
          </div>
        )}

        {/* 전송 버튼 */}
        <button
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
          style={{
            width: "100%", padding: "13px", marginTop: "12px",
            background: (uploading || files.length === 0)
              ? `${config.theme.primaryColor}50`
              : config.theme.primaryColor,
            color: "#fff", border: "none", borderRadius: "6px",
            fontFamily: config.theme.fontFamily, fontSize: "13px",
            cursor: (uploading || files.length === 0) ? "default" : "pointer",
            fontWeight: 300, transition: "background 0.2s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
          }}
        >
          {uploading ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                style={{ display: "inline-block", fontSize: "14px" }}
              >⏳</motion.span>
              전송 중...
            </>
          ) : (
            "전송하기"
          )}
        </button>

        <p style={{ fontSize: "10px", color: `${config.theme.lightText}80`, marginTop: "10px", textAlign: "center", fontWeight: 300, lineHeight: 1.6 }}>
          사진과 영상은 신랑·신부에게 직접 전달됩니다
          <br />파일당 최대 {config.photoDrop.maxFileSizeMB}MB
        </p>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   오시는 길
   ═══════════════════════════════════════════ */
function Location({ showToast }) {
  const [st, setSt] = useState(false);
  const {lat,lng,kakaoMapUrl,naverMapUrl,tmapUrl}=config.map;
  const {location,address,floor,phone}=config.wedding;
  const fa=`${address} ${floor}`;
  const cp=async()=>{const ok=await copyToClipboard(fa);showToast(ok?"주소가 복사되었습니다":"복사에 실패했습니다");};
  const nl=[
    {label:"카카오맵",icon:"🗺",url:kakaoMapUrl||`https://map.kakao.com/link/map/${encodeURIComponent(location)},${lat},${lng}`,bg:"#FEE500"},
    {label:"네이버지도",icon:"📍",url:naverMapUrl||`https://map.naver.com/v5/search/${encodeURIComponent(address)}`,bg:"#03C75A"},
    {label:"티맵",icon:"🚗",url:tmapUrl||`https://apis.openapi.sk.com/tmap/app/routes?appKey=&name=${encodeURIComponent(location)}&lon=${lng}&lat=${lat}`,bg:"#0064FF"},
  ];
  const tr=config.transport||{};
  return (
    <section style={{padding:"44px 24px",textAlign:"center"}}>
      <p style={{fontSize:"11px",letterSpacing:"6px",color:config.theme.accentColor,fontFamily:config.theme.fontFamily,marginBottom:"8px",fontWeight:300}}>LOCATION</p>
      <p style={{fontSize:"13px",color:config.theme.lightText,fontFamily:config.theme.fontFamily,marginBottom:"24px",fontWeight:300}}>오시는 길</p>
      <a href={nl[0].url} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none",display:"block"}}>
        <div style={{width:"100%",height:"200px",borderRadius:"10px",position:"relative",overflow:"hidden",background:"linear-gradient(135deg,#E8E0D4,#D8CFC3 50%,#C8BFAF)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"absolute",inset:0,opacity:0.06,backgroundImage:`linear-gradient(${config.theme.textColor} 1px,transparent 1px),linear-gradient(90deg,${config.theme.textColor} 1px,transparent 1px)`,backgroundSize:"40px 40px"}}/>
          <div style={{width:"36px",height:"36px",borderRadius:"50% 50% 50% 0",transform:"rotate(-45deg)",background:config.theme.accentColor,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:"10px",boxShadow:"0 2px 8px rgba(0,0,0,0.12)"}}>
            <span style={{transform:"rotate(45deg)",fontSize:"14px",color:"#fff"}}>♥</span>
          </div>
          <p style={{fontSize:"13px",fontFamily:config.theme.fontFamily,color:config.theme.textColor,fontWeight:400,position:"relative"}}>{location}</p>
          <p style={{fontSize:"10px",color:config.theme.lightText,marginTop:"4px",position:"relative"}}>터치하면 지도에서 열립니다</p>
        </div>
      </a>
      <div style={{marginTop:"24px"}}>
        <p style={{fontSize:"15px",fontFamily:config.theme.fontFamily,color:config.theme.textColor,fontWeight:400}}>{location}</p>
        <p style={{fontSize:"12px",color:config.theme.lightText,fontFamily:config.theme.fontFamily,marginTop:"6px",lineHeight:1.8,fontWeight:300}}>{address}<br/>{floor}</p>
        {phone&&<a href={`tel:${phone}`} style={{display:"inline-block",marginTop:"8px",fontSize:"12px",color:config.theme.accentColor,textDecoration:"none",borderBottom:`1px solid ${config.theme.accentColor}30`,paddingBottom:"1px",fontWeight:300}}>☎ {phone}</a>}
      </div>
      <button onClick={cp} style={{marginTop:"16px",padding:"10px 24px",background:"#fff",color:config.theme.textColor,border:`1px solid ${config.theme.accentColor}30`,borderRadius:"20px",fontSize:"12px",fontFamily:config.theme.fontFamily,cursor:"pointer",fontWeight:300}}>
        주소 복사하기
      </button>
      <div style={{display:"flex",gap:"12px",justifyContent:"center",marginTop:"20px"}}>
        {nl.map(n=>(
          <a key={n.label} href={n.url} target="_blank" rel="noopener noreferrer" style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"6px",textDecoration:"none"}}>
            <div style={{width:"46px",height:"46px",borderRadius:"12px",background:n.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",boxShadow:"0 2px 6px rgba(0,0,0,0.08)"}}>{n.icon}</div>
            <span style={{fontSize:"10px",color:config.theme.lightText,fontFamily:config.theme.fontFamily}}>{n.label}</span>
          </a>
        ))}
      </div>
      <div style={{marginTop:"28px"}}>
        <button onClick={()=>setSt(!st)} style={{padding:"11px 22px",background:"transparent",border:`1px solid ${config.theme.accentColor}25`,borderRadius:"8px",fontSize:"13px",fontFamily:config.theme.fontFamily,color:config.theme.textColor,cursor:"pointer",display:"flex",alignItems:"center",gap:"8px",margin:"0 auto",fontWeight:300}}>
          교통 안내<motion.span animate={{rotate:st?180:0}} transition={{duration:0.3}} style={{fontSize:"9px",display:"inline-block"}}>▼</motion.span>
        </button>
        <AnimatePresence>
          {st&&(
            <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.3}} style={{overflow:"hidden"}}>
              <div style={{marginTop:"16px",textAlign:"left",maxWidth:"320px",margin:"16px auto 0"}}>
                {[{l:"지하철",v:tr.subway},{l:"버스",v:tr.bus},{l:"주차",v:tr.parking}].filter(t=>t.v).map(t=>(
                  <div key={t.l} style={{display:"flex",gap:"12px",padding:"11px 0",borderBottom:`1px solid ${config.theme.accentColor}08`}}>
                    <span style={{fontSize:"11px",color:config.theme.accentColor,fontWeight:400,minWidth:"36px",fontFamily:config.theme.fontFamily}}>{t.l}</span>
                    <span style={{fontSize:"12px",color:config.theme.textColor,fontFamily:config.theme.fontFamily,lineHeight:1.7,fontWeight:300}}>{t.v}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   축의금
   ═══════════════════════════════════════════ */
function Account({ showToast }) {
  const [ot, setOt] = useState(null);
  const hc = async(t) => { const ok=await copyToClipboard(t);showToast(ok?"계좌번호가 복사되었습니다":"복사에 실패했습니다"); };
  const ai = (a) => (
    <div key={a.number} style={{padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${config.theme.accentColor}08`}}>
      <div>
        <p style={{fontSize:"11px",color:config.theme.lightText,fontWeight:300}}>{a.bank}</p>
        <p style={{fontSize:"14px",color:config.theme.textColor,fontFamily:config.theme.fontFamily,marginTop:"3px",fontWeight:300,letterSpacing:"0.5px"}}>{a.number}</p>
        <p style={{fontSize:"11px",color:config.theme.lightText,marginTop:"2px",fontWeight:300}}>{a.holder}</p>
      </div>
      <button onClick={()=>hc(a.number)} style={{padding:"7px 14px",background:"#fff",color:config.theme.textColor,border:`1px solid ${config.theme.accentColor}30`,borderRadius:"6px",fontSize:"11px",cursor:"pointer",fontFamily:config.theme.fontFamily,fontWeight:300}}>
        복사
      </button>
    </div>
  );
  const rs = (p, lb) => {
    const all=[...p.accounts,...(p.parentAccounts||[])];const io=ot===lb;
    return (
      <div key={lb} style={{marginBottom:"10px"}}>
        <button onClick={()=>setOt(io?null:lb)} style={{width:"100%",padding:"14px 20px",background:io?`${config.theme.accentColor}10`:"#fff",border:`1px solid ${config.theme.accentColor}20`,borderRadius:"8px",cursor:"pointer",fontFamily:config.theme.fontFamily,fontSize:"14px",color:config.theme.textColor,display:"flex",justifyContent:"space-between",alignItems:"center",fontWeight:300}}>
          <span>{lb}측 계좌</span>
          <motion.span animate={{rotate:io?180:0}} transition={{duration:0.3}} style={{fontSize:"9px",color:config.theme.lightText}}>▼</motion.span>
        </button>
        <AnimatePresence>
          {io&&(<motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.3}} style={{overflow:"hidden"}}>{all.map(ai)}</motion.div>)}
        </AnimatePresence>
      </div>
    );
  };
  return (
    <section style={{padding:"44px 24px",textAlign:"center"}}>
      <p style={{fontSize:"11px",letterSpacing:"6px",color:config.theme.accentColor,fontFamily:config.theme.fontFamily,marginBottom:"8px",fontWeight:300}}>ACCOUNT</p>
      <p style={{fontSize:"13px",color:config.theme.lightText,fontFamily:config.theme.fontFamily,marginBottom:"24px",fontWeight:300}}>축하의 마음을 전해주세요</p>
      <div style={{maxWidth:"360px",margin:"0 auto"}}>{rs(config.groom,"신랑")}{rs(config.bride,"신부")}</div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   방명록
   ═══════════════════════════════════════════ */
function Guestbook({ showToast }) {
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nm, setNm] = useState("");
  const [tx, setTx] = useState("");
  const [pw, setPw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dt, setDt] = useState(null);
  const [dp, setDp] = useState("");
  const [de, setDe] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sa, setSa] = useState(false);

  const gasUrl = config.guestbook.gasUrl;
  const isOnline = !!gasUrl;
  const PV = 3;
  const vis = sa ? msgs : msgs.slice(0, PV);
  const canSubmit = nm.trim() && tx.trim() && pw.trim().length >= 4 && !submitting;

  // ── 마운트 시 방명록 조회 ──
  useEffect(() => {
    if (!isOnline) return;
    setLoading(true);
    fetch(gasUrl)
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setMsgs(res.data.map(d => ({
            id: String(d.id), name: String(d.name),
            text: String(d.text), date: String(d.date),
          })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [gasUrl, isOnline]);

  // ── 등록 ──
  const handleSubmit = async () => {
    if (!canSubmit) return;

    // 오프라인(데모) 모드
    if (!isOnline) {
      const now = new Date();
      const dateStr = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,"0")}.${String(now.getDate()).padStart(2,"0")}`;
      setMsgs(p => [{ id: String(Date.now()), name: nm.trim(), text: tx.trim(), date: dateStr }, ...p]);
      setNm(""); setTx(""); setPw("");
      showToast("축하 메시지가 등록되었습니다");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(gasUrl, {
        method: "POST",
        body: JSON.stringify({ name: nm.trim(), text: tx.trim(), password: pw.trim() }),
      });
      const result = await res.json();
      if (result.success) {
        const now = new Date();
        const dateStr = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,"0")}.${String(now.getDate()).padStart(2,"0")}`;
        setMsgs(p => [{ id: String(result.id), name: nm.trim(), text: tx.trim(), date: dateStr }, ...p]);
        setNm(""); setTx(""); setPw("");
        showToast("축하 메시지가 등록되었습니다");
      } else {
        showToast("등록에 실패했습니다. 다시 시도해주세요");
      }
    } catch {
      showToast("네트워크 오류가 발생했습니다");
    }
    setSubmitting(false);
  };

  // ── 삭제 ──
  const handleDelete = async (id) => {
    if (!dp.trim()) { setDe(true); return; }

    // 오프라인(데모) 모드
    if (!isOnline) {
      setMsgs(p => p.filter(x => x.id !== id));
      setDt(null); setDp(""); setDe(false);
      showToast("메시지가 삭제되었습니다");
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(gasUrl, {
        method: "POST",
        body: JSON.stringify({ action: "delete", id, password: dp.trim() }),
      });
      const result = await res.json();
      if (result.success) {
        setMsgs(p => p.filter(x => x.id !== id));
        setDt(null); setDp(""); setDe(false);
        showToast("메시지가 삭제되었습니다");
      } else {
        setDe(true);
      }
    } catch {
      showToast("네트워크 오류가 발생했습니다");
    }
    setDeleting(false);
  };

  const iStyle = { width: "100%", padding: "11px 14px", border: `1px solid ${config.theme.accentColor}25`, borderRadius: "6px", fontFamily: config.theme.fontFamily, fontSize: "13px", marginBottom: "8px", background: "#fff", color: config.theme.textColor, outline: "none", boxSizing: "border-box", fontWeight: 300 };

  return (
    <section style={{ padding: "44px 24px", textAlign: "center" }}>
      <p style={{ fontSize: "11px", letterSpacing: "6px", color: config.theme.accentColor, fontFamily: config.theme.fontFamily, marginBottom: "8px", fontWeight: 300 }}>GUESTBOOK</p>
      <p style={{ fontSize: "13px", color: config.theme.lightText, fontFamily: config.theme.fontFamily, marginBottom: "24px", fontWeight: 300 }}>축하 메시지를 남겨주세요</p>

      {/* 입력 폼 */}
      <div style={{ maxWidth: "360px", margin: "0 auto 28px", textAlign: "left" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <input value={nm} onChange={e => setNm(e.target.value)} placeholder="이름" maxLength={10} disabled={submitting} style={{ ...iStyle, flex: 1 }} />
          <input value={pw} onChange={e => setPw(e.target.value)} placeholder="비밀번호 (4자리+)" type="password" maxLength={8} disabled={submitting} style={{ ...iStyle, flex: 1 }} />
        </div>
        <textarea value={tx} onChange={e => setTx(e.target.value)} placeholder="축하 메시지를 남겨주세요" rows={3} maxLength={200} disabled={submitting} style={{ ...iStyle, resize: "none" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: config.theme.lightText }}>{tx.length}/200</span>
          <button onClick={handleSubmit} disabled={!canSubmit} style={{
            padding: "10px 28px",
            background: canSubmit ? config.theme.primaryColor : `${config.theme.primaryColor}50`,
            color: "#fff", border: "none", borderRadius: "6px",
            fontFamily: config.theme.fontFamily, fontSize: "13px",
            cursor: canSubmit ? "pointer" : "default",
            transition: "background 0.2s", fontWeight: 300,
          }}>
            {submitting ? "등록 중..." : "등록하기"}
          </button>
        </div>
      </div>

      {/* 로딩 */}
      {loading && (
        <p style={{ fontSize: "12px", color: config.theme.lightText, fontFamily: config.theme.fontFamily, marginBottom: "12px", fontWeight: 300 }}>
          메시지를 불러오는 중...
        </p>
      )}

      {/* 메시지 수 */}
      {!loading && (
        <p style={{ fontSize: "12px", color: config.theme.lightText, fontFamily: config.theme.fontFamily, marginBottom: "12px", fontWeight: 300 }}>
          총 {msgs.length}개의 축하 메시지
        </p>
      )}

      {/* 메시지 목록 */}
      <div style={{ maxWidth: "360px", margin: "0 auto" }}>
        <AnimatePresence>
          {vis.map(mg => (
            <motion.div key={mg.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}
              style={{ padding: "16px", borderBottom: `1px solid ${config.theme.accentColor}08`, textAlign: "left" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: `${config.theme.accentColor}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: config.theme.accentColor, fontFamily: config.theme.fontFamily, fontWeight: 400 }}>
                    {mg.name.charAt(0)}
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 400, color: config.theme.textColor, fontFamily: config.theme.fontFamily }}>{mg.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "10px", color: config.theme.lightText }}>{mg.date}</span>
                  <button onClick={() => { setDt(dt === mg.id ? null : mg.id); setDp(""); setDe(false); }}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: `${config.theme.lightText}80`, padding: "2px 4px" }}>✕</button>
                </div>
              </div>
              <p style={{ fontSize: "13px", color: config.theme.textColor, lineHeight: 1.7, fontFamily: config.theme.fontFamily, paddingLeft: "34px", fontWeight: 300 }}>{mg.text}</p>

              {/* 삭제 패널 */}
              <AnimatePresence>
                {dt === mg.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: "hidden" }}>
                    <div style={{ marginTop: "10px", paddingLeft: "34px", display: "flex", gap: "6px", alignItems: "center" }}>
                      <input value={dp} onChange={e => { setDp(e.target.value); setDe(false); }} placeholder="비밀번호" type="password" disabled={deleting}
                        style={{ flex: 1, padding: "8px 10px", border: `1px solid ${de ? "#d06060" : config.theme.accentColor + "25"}`, borderRadius: "4px", fontSize: "12px", fontFamily: config.theme.fontFamily, outline: "none", background: de ? "#fff5f5" : "#fff", color: config.theme.textColor }} />
                      <button onClick={() => handleDelete(mg.id)} disabled={deleting}
                        style={{ padding: "8px 14px", background: "#d06060", color: "#fff", border: "none", borderRadius: "4px", fontSize: "11px", cursor: deleting ? "default" : "pointer", whiteSpace: "nowrap", opacity: deleting ? 0.6 : 1 }}>
                        {deleting ? "삭제 중..." : "삭제"}
                      </button>
                    </div>
                    {de && <p style={{ fontSize: "11px", color: "#d06060", paddingLeft: "34px", marginTop: "4px", textAlign: "left" }}>비밀번호가 일치하지 않습니다</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* 더보기 */}
        {msgs.length > PV && (
          <button onClick={() => setSa(!sa)} style={{
            marginTop: "14px", padding: "10px 24px", background: "transparent",
            border: `1px solid ${config.theme.accentColor}20`, borderRadius: "20px",
            fontSize: "12px", fontFamily: config.theme.fontFamily, color: config.theme.textColor,
            cursor: "pointer", fontWeight: 300,
          }}>
            {sa ? "접기" : `더보기 (${msgs.length - PV}개)`}
          </button>
        )}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════ */
function ShareButtons({ showToast }) {
  const cl=async()=>{const ok=await copyToClipboard(window.location.href);showToast(ok?"링크가 복사되었습니다":"복사에 실패했습니다");};
  const kk=()=>{showToast("카카오톡 공유는 배포 후 SDK 연동 시 동작합니다");};
  return (
    <section style={{padding:"44px 24px 20px",textAlign:"center"}}>
      <p style={{fontSize:"11px",letterSpacing:"6px",color:config.theme.accentColor,fontFamily:config.theme.fontFamily,marginBottom:"8px",fontWeight:300}}>SHARE</p>
      <p style={{fontSize:"13px",color:config.theme.lightText,fontFamily:config.theme.fontFamily,marginBottom:"24px",fontWeight:300}}>소중한 분들에게 알려주세요</p>
      <div style={{display:"flex",gap:"16px",justifyContent:"center"}}>
        <button onClick={kk} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"8px",background:"none",border:"none",cursor:"pointer"}}>
          <div style={{width:"50px",height:"50px",borderRadius:"14px",background:"#FEE500",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 6px rgba(0,0,0,0.08)"}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#3D1D1D"><path d="M12 3C6.48 3 2 6.36 2 10.5c0 2.64 1.74 4.98 4.38 6.32-.14.52-.9 3.28-.93 3.5 0 0-.02.16.08.22.1.06.22.02.22.02.29-.04 3.38-2.22 3.92-2.6.74.1 1.52.16 2.33.16 5.52 0 10-3.36 10-7.5S17.52 3 12 3z"/></svg>
          </div>
          <span style={{fontSize:"10px",color:config.theme.lightText,fontFamily:config.theme.fontFamily}}>카카오톡</span>
        </button>
        <button onClick={cl} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"8px",background:"none",border:"none",cursor:"pointer"}}>
          <div style={{width:"50px",height:"50px",borderRadius:"14px",background:"#f0ece6",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 6px rgba(0,0,0,0.08)"}}>
            <span style={{fontSize:"18px",color:config.theme.primaryColor}}>🔗</span>
          </div>
          <span style={{fontSize:"10px",color:config.theme.lightText,fontFamily:config.theme.fontFamily}}>링크 복사</span>
        </button>
      </div>
    </section>
  );
}

function BgmPlayer({ shouldPlay }) {
  const [ip, setIp]=useState(false);const ar=useRef(null);
  useEffect(()=>{if(config.bgm.src){ar.current=new Audio(config.bgm.src);ar.current.loop=true;ar.current.volume=0.4;}return()=>{if(ar.current){ar.current.pause();ar.current=null;}};},[]);

  // 인트로 "청첩장 열기" 클릭 시 자동 재생
  useEffect(()=>{
    if(shouldPlay&&config.bgm.autoPlay&&!ip){
      if(ar.current){ar.current.play().then(()=>setIp(true)).catch(()=>{});}
      else if(!config.bgm.src){setIp(true);} // 데모 모드
    }
  },[shouldPlay, ip]);

  const tg=()=>{if(!ar.current&&!config.bgm.src){setIp(p=>!p);return;}if(!ar.current)return;if(ip){ar.current.pause();setIp(false);}else{ar.current.play().then(()=>setIp(true)).catch(()=>{});}};
  return (
    <motion.button onClick={tg} whileTap={{scale:0.85}} style={{position:"fixed",bottom:"24px",right:"24px",zIndex:200,width:"42px",height:"42px",borderRadius:"50%",background:ip?config.theme.accentColor:"rgba(255,255,255,0.95)",border:`1px solid ${config.theme.accentColor}30`,boxShadow:"0 2px 10px rgba(0,0,0,0.1)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>
      <motion.span animate={{rotate:ip?360:0}} transition={ip?{repeat:Infinity,duration:3,ease:"linear"}:{duration:0.3}} style={{fontSize:"16px",lineHeight:1,display:"block",color:ip?"#fff":config.theme.accentColor}}>♪</motion.span>
      {ip&&<motion.div animate={{scale:[1,1.7],opacity:[0.25,0]}} transition={{repeat:Infinity,duration:1.5,ease:"easeOut"}} style={{position:"absolute",width:"42px",height:"42px",borderRadius:"50%",border:`1px solid ${config.theme.accentColor}`}}/>}
    </motion.button>
  );
}

function Footer() {
  const wd=new Date(config.wedding.date);
  return (
    <footer style={{padding:"40px 24px 80px",textAlign:"center"}}>
      <div style={{width:"32px",height:"0.5px",background:config.theme.accentColor,opacity:0.25,margin:"0 auto 20px"}}/>
      <p style={{fontSize:"13px",color:config.theme.lightText,letterSpacing:"3px",fontFamily:config.theme.fontFamily,fontWeight:300}}>{config.groom.firstName} & {config.bride.firstName}</p>
      <p style={{fontSize:"11px",color:`${config.theme.lightText}80`,marginTop:"6px",fontFamily:config.theme.fontFamily,fontWeight:300}}>{wd.getFullYear()}.{String(wd.getMonth()+1).padStart(2,"0")}.{String(wd.getDate()).padStart(2,"0")}</p>
      <p style={{fontSize:"9px",color:`${config.theme.lightText}40`,marginTop:"16px",letterSpacing:"1px"}}>Made with ♥</p>
    </footer>
  );
}

export default function App() {
  const [showIntro, setShowIntro]=useState(true);
  const [toast, setToast]=useState(null);
  const showToast=(msg)=>{setToast(msg);setTimeout(()=>setToast(null),2000);};
  return (
    <div style={{maxWidth:"430px",margin:"0 auto",background:config.theme.backgroundColor,minHeight:"100vh",fontFamily:config.theme.fontFamily,color:config.theme.textColor,position:"relative",overflowX:"hidden"}}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;400;500;600&display=swap" rel="stylesheet"/>
      <BgmPlayer shouldPlay={!showIntro}/>
      <Toast message={toast}/>
      <AnimatePresence>{showIntro&&<IntroRouter onComplete={()=>setShowIntro(false)}/>}</AnimatePresence>
      <ScrollFadeIn><MainPhoto/></ScrollFadeIn>
      <Divider/>
      <ScrollFadeIn><Greeting/></ScrollFadeIn>
      <Divider/>
      <ScrollFadeIn><Calendar/></ScrollFadeIn>
      <Divider/>
      <ScrollFadeIn><Gallery/></ScrollFadeIn>
      <Divider/>
      <ScrollFadeIn><PhotoDrop showToast={showToast}/></ScrollFadeIn>
      <Divider/>
      <ScrollFadeIn><Location showToast={showToast}/></ScrollFadeIn>
      <Divider/>
      <ScrollFadeIn><Account showToast={showToast}/></ScrollFadeIn>
      <Divider/>
      <ScrollFadeIn><Guestbook showToast={showToast}/></ScrollFadeIn>
      <Divider/>
      <ScrollFadeIn><ShareButtons showToast={showToast}/></ScrollFadeIn>
      <Footer/>
    </div>
  );
}
