<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Rw9 | REAL-TIME SYNC v13.0.5</title>
    <script src="https://cdn.jsdelivr.net/npm/gun/gun.js"></script>
    <style>
        :root { --neon-purple: #bf00ff; --main-color: #bf00ff; }
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Consolas', monospace; }
        body { background: #000; color: #fff; height: 100vh; width: 100vw; overflow: hidden; display: flex; align-items: center; justify-content: center; }

        #bg-canvas { position: absolute; inset: 0; z-index: 1; opacity: 0.3; }

        /* ROBLOX BROADCAST (Mitte Oben) */
        #broadcast-layer { position: fixed; top: 15%; width: 100%; text-align: center; z-index: 2000; pointer-events: none; }
        .announcement { 
            font-size: 38px; font-weight: 900; color: #fff; 
            text-shadow: 0 0 25px var(--main-color); 
            background: rgba(0,0,0,0.7); display: inline-block; padding: 15px 50px; 
            border-radius: 12px; transform: scale(0); transition: 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
        }
        .announcement.show { transform: scale(1); }

        /* ADMIN CHAT */
        #chat-box { display: none; position: fixed; bottom: 30px; left: 30px; width: 380px; background: rgba(0,0,0,0.9); border: 1px solid #222; padding: 15px; z-index: 1000; }
        #chat-display { height: 100px; overflow-y: auto; font-size: 12px; margin-bottom: 10px; color: #444; }
        #chat-input { width: 100%; background: #050505; border: 1px solid #333; color: #fff; padding: 10px; outline: none; border-left: 3px solid var(--main-color); }

        /* SYSTEM UI */
        #update-ui { position: relative; z-index: 10; text-align: center; width: 650px; }
        h1 { font-size: 55px; letter-spacing: 15px; color: var(--main-color); text-shadow: 0 0 30px var(--main-color); }
        .flacker-e { display: inline-block; }
        .broken { opacity: 0.1; filter: blur(2px); transform: translateX(3px); }
        
        #status-text { color: #1a1a1a; font-size: 11px; letter-spacing: 4px; margin-top: 25px; font-weight: bold; }
        .progress-bar { width: 100%; height: 3px; background: #080808; margin-top: 40px; overflow: hidden; }
        #fill { height: 100%; background: var(--main-color); width: 45.12%; transition: 1s linear; }
        .stats { display: flex; justify-content: space-between; margin-top: 20px; font-size: 11px; color: #0a0a0a; }
    </style>
</head>
<body>

    <canvas id="bg-canvas"></canvas>

    <div id="broadcast-layer"><div id="announcement-text" class="announcement"></div></div>
    
    <div id="chat-box">
        <div id="chat-display"></div>
        <input type="text" id="chat-input" placeholder="Type /say [text]...">
    </div>

    <div id="update-ui">
        <p style="color:#080808; font-size:9px; margin-bottom:10px; letter-spacing:5px;">Rw9_LIVE_SYNC_v13.0.5</p>
        <h1>SYSTEM UPDAT<span id="target-e" class="flacker-e">e</span></h1>
        <div id="status-text">CONNECTING TO NETWORK...</div>
        <div class="progress-bar"><div id="fill"></div></div>
        <div class="stats">
            <div id="perc-display">45.12%</div>
            <div id="eta-display">ETA: 00:23:00</div>
        </div>
    </div>

    <script>
        // --- LIVE SYNC ENGINE ---
        // Wir nutzen mehrere Relay-Server für bessere Stabilität
        const gun = Gun([
            'https://gun-manhattan.herokuapp.com/gun',
            'https://gun-ams1.marda.io/gun'
        ]);
        const systemNode = gun.get('rw9_super_sync_v2');

        let duration = 23 * 60;
        let isAdmin = false;

        // --- AUTH (ALT + S) ---
        window.addEventListener('keydown', (e) => {
            if (e.altKey && (e.key === 's' || e.key === 'S')) {
                e.preventDefault();
                isAdmin = true;
                document.getElementById('chat-box').style.display = 'block';
                document.getElementById('status-text').innerHTML = "AUTHORIZED ACCESS: <span style='color:var(--main-color)'>Rw9</span>";
            }
        });

        // --- REAL-TIME RECEIVER (Das ist das "Live"-Teil) ---
        systemNode.on((data) => {
            // Wenn eine neue Nachricht kommt
            if(data.msg && data.timestamp !== window.lastMsgTime) {
                window.lastMsgTime = data.timestamp;
                const ann = document.getElementById('announcement-text');
                ann.innerText = data.msg;
                ann.classList.add('show');
                
                // Sound-Effekt simulieren (optional)
                console.log("NEUE NACHRICHT LIVE: " + data.msg);

                setTimeout(() => ann.classList.remove('show'), 4000);
            }
            // Wenn Farbe geändert wird
            if(data.color) {
                document.documentElement.style.setProperty('--main-color', data.color);
            }
        });

        // --- ADMIN SENDEN ---
        const input = document.getElementById('chat-input');
        input.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') {
                let val = input.value;
                if(val.startsWith("/say ")) {
                    // Wir schicken einen Zeitstempel mit, damit Gun.js merkt: "Das ist neu!"
                    systemNode.put({ 
                        msg: val.replace("/say ", ""), 
                        timestamp: Date.now() 
                    });
                }
                if(val.startsWith("/color ")) {
                    systemNode.put({ color: val.split(" ")[1] });
                }
                input.value = "";
            }
        });

        // --- TIMER & PROGRESS ---
        function startUI() {
            document.getElementById('status-text').innerText = "SYSTEM STANDBY...";
            
            setInterval(() => {
                // Timer
                if(duration > 0) duration--;
                let m = Math.floor(duration/60).toString().padStart(2, '0');
                let s = (duration%60).toString().padStart(2, '0');
                document.getElementById('eta-display').innerText = `ETA: 00:${m}:${s}`;

                // Prozentrechnung (von 45.12% auf 100% innerhalb der 23 Min)
                let elapsed = (23 * 60) - duration;
                let currentP = 45.12 + (elapsed * (54.88 / (23 * 60)));
                document.getElementById('perc-display').innerText = currentP.toFixed(2) + "%";
                document.getElementById('fill').style.width = currentP + "%";

                // Das "e" flackert
                const e = document.getElementById('target-e');
                if(Math.random() > 0.9) {
                    e.classList.add('broken');
                    setTimeout(() => e.classList.remove('broken'), 100);
                }
            }, 1000);
            
            animateBG();
        }

        // --- BACKGROUND ---
        const canvas = document.getElementById('bg-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth; canvas.height = window.innerHeight;
        let dots = [];
        for(let i=0; i<70; i++) dots.push({x: Math.random()*canvas.width, y: Math.random()*canvas.height, r: Math.random()*1.5});

        function animateBG() {
            ctx.clearRect(0,0,canvas.width,canvas.height);
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--main-color');
            dots.forEach(d => {
                ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI*2); ctx.fill();
                d.y -= 0.3; if(d.y < 0) d.y = canvas.height;
            });
            requestAnimationFrame(animateBG);
        }

        window.onload = startUI;
    </script>
</body>
</html>
