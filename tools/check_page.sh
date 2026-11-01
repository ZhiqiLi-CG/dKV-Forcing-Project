#!/usr/bin/env bash
# Functional test + screenshots of the project page in headless Chromium. Usage: check_page.sh [shots...] where each shot is "scheme fraction name"
B=~/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell
SD=/tmp/claude-2161/-mnt-home-zhiqili/1bd40e91-8f0f-480b-a6f6-3c32d9fb6268/scratchpad
cd /mnt/home/zhiqili/causal/dKV-Forcing-Project
sed 's#</body>#<script>\nwindow.addEventListener("load",()=>{setTimeout(()=>{const out=[];try{\nfor(const sc of SCHEMES){for(const [k,inf] of Object.entries(sc.info)){const c=DATA.code[inf[2]];if(!c){out.push("NOKEY "+sc.id+"."+k);continue}for(const m of inf[3]) if(!c.text.includes(m)) out.push("MARK "+sc.id+"."+k+": "+m)}}\nSCHEMES.forEach((sc,i)=>{selectScheme(i);const n=600;for(let j=0;j<=n;j++){WT.t=WT.total*j/n;draw()}const keys=new Set();for(let j=0;j<=n;j++){const [si,u]=locate(WT.total*j/n);keys.add(sc.now(WT.S,si,u)[3])}for(const k of keys) if(!sc.info[k]) out.push("NOINFO "+sc.id+" "+k);out.push("OK "+sc.id)});\n}catch(e){out.push("ERR "+e.message+" "+e.stack)}document.body.insertAdjacentHTML("beforeend","<pre id=\\"testout\\">"+out.join("\\n")+"</pre>")},800)});\n</script>\n</body>#' index.html > __test.html
timeout 60 $B --no-sandbox --disable-gpu --virtual-time-budget=4000 --dump-dom "file://$PWD/__test.html" 2>/dev/null | python3 -c "
import sys,re,html; d=sys.stdin.read(); m=re.search(r'<pre id=\"testout\">(.*?)</pre>', d, re.S); print(html.unescape(m.group(1)) if m else 'NO TEST OUTPUT')"
sed 's#</body>#<style>header.head,.teaser,\#abstract,\#compare,\#method,\#numbers,\#bibtex,footer,nav.top{display:none!important}\#how{padding-top:20px}</style><script>\nwindow.addEventListener("load",()=>{const q=new URLSearchParams(location.search);selectScheme(+q.get("s"));wtPlay(false);WT.started=true;WT.t=WT.total*(+q.get("f"));draw();});\n</script>\n</body>#' index.html > __shot.html
for spec in "$@"; do set -- $spec; timeout 60 $B --no-sandbox --disable-gpu --hide-scrollbars --window-size=1280,1000 --virtual-time-budget=2500 --screenshot=$SD/shot_$3.png "file://$PWD/__shot.html?s=$1&f=$2" >/dev/null 2>&1; done
rm -f __test.html __shot.html
