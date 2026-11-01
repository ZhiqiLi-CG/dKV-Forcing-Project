# dKV-Forcing-Project

Project page of *dKV Forcing: Separating Generation and Memory Representations through a Differentiable KV Cache* (Zhiqi Li, Bo Zhu): https://zhiqili-cg.github.io/dKV-Forcing-Project/

- Code: https://github.com/ZhiqiLi-CG/dKV-Forcing
- Author homepage: https://zhiqili-cg.github.io

Static page: `index.html`, `page.css`, `page.js` (generated). `tools/page.src.js` is the page script, `tools/build_page.py` inlines the data (videos, prompts, the PyTorch listings of the paper's appendix, and the measured memory traces in `tools/traces.json`) into `page.js`, and `tools/check_page.sh` runs a headless-Chromium test. Videos under `assets/videos` are the generations evaluated in the paper (H.264, 832×480, 16 fps).
