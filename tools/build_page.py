# Build dKV-Forcing-Project/page.js = data (videos, prompts, code listings, measured traces) + page.src.js
import json, re
SITE="/mnt/data/zhiqili/kvpaper_renders/site"; PAPER="/mnt/home/zhiqili/causal/kvpaper_overleaf_full_8294895"; OUT="/mnt/home/zhiqili/causal/dKV-Forcing-Project/page.js"
plan=json.load(open(f"{SITE}/video_plan.json")); full=json.load(open(f"{PAPER}/figures/qual_prompts.json"))
cap=lambda t: t[0].upper()+t[1:]
def vids(suite,title):
    v={x["tag"]:{"src":x["out"],"poster":x["poster"]} for x in plan if x["suite"]==suite and x["title"]==title}; assert len(v)==3,(suite,title); return v
order=[("long240","man wiping a kitchen counter"),("long240std","cat drinking water"),("long60","cat and dog in a sword fight"),("long60","eye with the earth as its iris"),("long60","child blowing bubbles")]
prompts=[{"title":cap(t),"duration":"60 s" if s=="long60" else "240 s","prompt":full.get(t,""),"videos":vids(s,t)} for s,t in order]
prompts[1]["prompt"]="A cat drinking water. (VBench-Long standard prompt)"
assert all(p["prompt"] for p in prompts)
hero=[]
for s,t in [("long60","cat and dog in a sword fight"),("long60","child blowing bubbles"),("long240","man wiping a kitchen counter"),("long240std","cat drinking water")]:
    x=[y for y in plan if y["suite"]==s and y["title"]==t and y["tag"]=="ours"][0]
    hero.append({"title":cap(t),"duration":"60 s" if s=="long60" else "240 s","src":x["out"],"poster":x["poster"]})
tex=open(f"{PAPER}/appendices/figure_in_code.tex").read()
blocks=re.findall(r"\\begin\{pycode\}\n(.*?)\n\\end\{pycode\}", tex, flags=re.S); assert len(blocks)==10
b4=blocks[3]; i4=b4.index("# the self-attention of one block"); src="paper, Appendix B.4"
code={"traversal":("The single traversal (training loop)",blocks[0]),"commit":("Write-once page table and the commit",blocks[1]),"handle":("Data-free handle and snapshot",blocks[2]),
 "pagecat":("_PageCat: reading through handles",b4[:i4].rstrip()),"attention":("Self-attention of one block",b4[i4:]),"lora":("Writer residual φ",blocks[4]),
 "groups":("Checkpoint groups",blocks[5]),"forwards":("The two forwards",blocks[6]),"mutable":("Ordinary path: mutable cache",blocks[7]),
 "sfcut":("Self Forcing / CF++: cutting the cache",blocks[8]),"twopass":("SGF: two-pass reconstruction",blocks[9])}
code={k:{"title":t,"src":src,"text":v} for k,(t,v) in code.items()}
DATA={"models":[["cfpp","CF++","writes detached"],["sgf","SGF","memory gradient"],["ours","dKV Forcing","ours"]],"prompts":prompts,"hero":hero,"code":code,"traces":json.load(open(f"{SITE}/traces.json"))}
js=open(f"{SITE}/page.src.js").read().replace("/*__DATA__*/","const DATA = "+json.dumps(DATA,ensure_ascii=False,separators=(",",":"))+";",1)
open(OUT,"w").write(js); print("page.js", len(js), "bytes")
