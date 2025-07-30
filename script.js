  (()=>{ // Start IIFE
    'use strict';

    /* -------- helpers -------- */
    const $ = s=>document.querySelector(s);
    const $$= s=>document.querySelectorAll(s);
    const debounce = (fn,ms)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);} };
    const notify=(msg,ms=3000)=>{const n=$("#notification");if(!n)return;n.textContent=msg;n.style.display="block";n.style.opacity=1;n.style.transition='opacity .3s';
                                 setTimeout(()=>{n.style.opacity=0;setTimeout(()=>n.style.display="none",300);},ms);};

    /* -------- dark-mode toggle -------- */
    const themeBtn=$(".theme-toggle");
    const setMode=isDark=>{document.body.classList.toggle("dark-mode",isDark);themeBtn.setAttribute("aria-pressed",isDark);localStorage.theme=isDark?"dark":"light";if(typeof resizeCanvas==='function')setTimeout(resizeCanvas,50)}; // whiteboard resize added
    themeBtn.addEventListener("click",()=>setMode(!document.body.classList.contains("dark-mode")));

    /* -------- Dashboard Tile Click Handler & Iframe -------- */
    const dashboardTiles = $$('#dashboard .tile');
    const frameContainer = $('#frame-container');
    const contentFrame = $('#content-frame');
    const closeFrame = $('#close-frame');
    const fallbackMessage = $('#fallback-message');
    const fallbackLink = $('#fallback-link');
    const frameSpinner = frameContainer?.querySelector('.iframe-loading');
    let frameLoadTimeout;

    function showFrameSpinner(show) { if (frameSpinner) frameSpinner.style.display = show ? 'block' : 'none'; }

    function loadContentInFrame(url) {
         if (!frameContainer || !contentFrame || !fallbackLink || !fallbackMessage || !closeFrame ) return;

         contentFrame.src = 'about:blank';
         fallbackMessage.style.display = 'none';
         fallbackLink.href = url;
         frameContainer.classList.add('active');
         showFrameSpinner(true);
         // Set reasonable width/height for the frame container itself before loading
         frameContainer.style.width = '100%';
         frameContainer.style.height = '70vh'; // Adjust as needed

         contentFrame.src = url; // Load the actual URL
         frameContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

         clearTimeout(frameLoadTimeout);

         // Reduced timeout as requested by user feedback
         frameLoadTimeout = setTimeout(() => {
           let wasBlockedOrFailed = false;
           try {
             // Check if content loaded or was blocked (more likely for login pages)
             if (contentFrame.contentWindow?.length === 0 || contentFrame.contentDocument?.body.innerHTML.trim() === "") {
                  // Check if it's a known login page URL that might just appear blank due to X-Frame-Options
                  const knownLoginDomains = ['dymension.co.uk', 'storemobile.apps.mymorri.com'];
                  const currentDomain = new URL(contentFrame.src).hostname;
                  if (!knownLoginDomains.some(domain => currentDomain.includes(domain))) {
                      console.warn('[Fallback Check] iframe content seems empty after timeout for:', url);
                      wasBlockedOrFailed = true;
                  } else {
                       console.log('[Fallback Check] Known login page detected, assuming load success despite potential cross-origin limitations.');
                       showFrameSpinner(false); // Hide spinner even if content is inaccessible
                       fallbackMessage.style.display = 'none'; // Don't show fallback for known login pages
                       return; // Skip further fallback logic
                  }
             }
           } catch (e) {
             console.warn('[Fallback Check] Cross-origin error accessing iframe content after timeout for:', url, e);
             wasBlockedOrFailed = true; // Assume failure on error
           }

            // Show fallback only if it wasn't a known login page and spinner is still visible
           if (wasBlockedOrFailed && frameSpinner?.style.display !== 'none') {
             showFrameSpinner(false);
             fallbackMessage.style.display = 'block';
             notify("Content embedding likely blocked. Use fallback link.", 4000);
           } else if (frameSpinner?.style.display !== 'none') {
              // If spinner still visible but no explicit block detected, assume slow load
              showFrameSpinner(false);
              fallbackMessage.style.display = 'block';
              notify("Content took a while to load.", 4000);
           }
         }, 8000); // Extended timeout slightly to 8s

         contentFrame.onload = function() {
             console.log('[iframe onload] Fired for:', contentFrame.src);
             clearTimeout(frameLoadTimeout);
             showFrameSpinner(false);
             fallbackMessage.style.display = 'none';
             // Check for specific "refused to connect" messages or blank pages post-load
             try {
                if (contentFrame.contentDocument?.body.innerHTML.trim() === "" && contentFrame.src !== 'about:blank') {
                    console.warn('[iframe onload] Content is blank after loading:', contentFrame.src);
                    fallbackMessage.style.display = 'block';
                }
             } catch(e) {
                console.warn('[iframe onload] Cross-origin error checking content:', e);
                // Potentially show fallback if access error implies block
                if (contentFrame.src !== 'about:blank') {
                     fallbackMessage.style.display = 'block';
                }
             }
         };
         contentFrame.onerror = function(err) {
             clearTimeout(frameLoadTimeout);
             showFrameSpinner(false);
             fallbackMessage.style.display = 'block';
             console.error('[iframe onerror] Fired for:', contentFrame.src, err);
             notify("Error loading content in frame.", 4000);
         };
       }


    if (closeFrame) { closeFrame.addEventListener('click', function() { if (!frameContainer || !contentFrame) return; frameContainer.classList.remove('active'); contentFrame.src = "about:blank"; fallbackMessage.style.display = "none"; showFrameSpinner(false); clearTimeout(frameLoadTimeout); }); }

    dashboardTiles.forEach(item => {
        item.addEventListener('click', function(e) {
            const url = this.getAttribute('href');
            const openType = this.dataset.open;
            if (openType === "external") {
                e.preventDefault();
                window.open(url, '_blank', 'noopener,noreferrer');
            } else if (openType === "frame") {
                e.preventDefault();
                loadContentInFrame(url);
            }
            // Let 'self' links navigate normally
        });
    });

    /* -------- WHITEBOARD -------- */
    const container=$("#whiteboard-container");
    const canvas   =$("#whiteboard");
    if(canvas){ // Check if canvas exists before proceeding
        const ctx=canvas.getContext("2d",{willReadFrequently:true}); // Added willReadFrequently
        const tools=$$(".tool-button");
        const colorPicker=$("#colorPicker");
        const brushSel=$("#brushSize");
        const fontSel=$("#fontSize");
        const eraserPreview=$("#eraser-preview");
        const fsBtn=$(".fullscreen-button");

        let currentTool="pen",drawing=false,currentStroke=null,strokes=[];
        let dpr=window.devicePixelRatio||1;
        let history = []; // For undo
        let historyIndex = -1;

        /*  util  */
        const themeBg = ()=>getComputedStyle(document.body).getPropertyValue(document.body.classList.contains("dark-mode")?"--dark-bg-color":"--light-bg-color").trim();
        const effectiveBg = ()=>{const f=[...strokes].reverse().find(s=>s.tool==="fill");return f?f.color:themeBg();};
        const getPos=e=>{const r=canvas.getBoundingClientRect();let clientX,clientY;if(e.touches){if(e.touches.length === 0) return null;clientX=e.touches[0].clientX;clientY=e.touches[0].clientY;}else{clientX=e.clientX;clientY=e.clientY;}if(clientX==null||clientY==null)return null;const x=(clientX-r.left);const y=(clientY-r.top);return{x,y};}; /* Adjusted for DPR */

        /*  History management */
         const saveState = () => {
             historyIndex++;
             // If we draw after undoing, discard future states
             if (historyIndex < history.length) { history.length = historyIndex; }
             // Store strokes and background color
             history.push({ strokes: JSON.parse(JSON.stringify(strokes)), bgColor: effectiveBg() });
              // Limit history size (optional)
             // if (history.length > 50) { history.shift(); historyIndex--; }
         };

         const undo = () => {
             if (historyIndex > 0) {
                 historyIndex--;
                 const previousState = history[historyIndex];
                 strokes = JSON.parse(JSON.stringify(previousState.strokes));
                 // Restore background color explicitly if needed, though render() should handle it
                 render();
                 saveLocal(); // Save undone state
                 notify("Undo");
             } else {
                // Maybe clear canvas if undoing the first action? Or just notify "Nothing to undo"
                // strokes = []; render(); saveLocal();
                notify("Nothing more to undo");
             }
         };

        /*  size / Hi-DPI  */
        const resizeCanvas=()=>{
          if (!canvas.parentElement) return;
          const {clientWidth:w,clientHeight:h}=canvas.parentElement;
          dpr=window.devicePixelRatio||1;
          // Check if size actually changed to avoid unnecessary redraws
          if (canvas.width === Math.round(w * dpr) && canvas.height === Math.round(h * dpr)) return;

          canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr); // Use Math.round
          canvas.style.width=w+"px";canvas.style.height=h+"px";
          ctx.setTransform(dpr,0,0,dpr,0,0);
          render(); // Render immediately after resize
        };

        /* drawing engine */
        const render=()=>{
          if(!ctx) return;
          const logicalWidth = canvas.width / dpr;
          const logicalHeight = canvas.height / dpr;

          ctx.clearRect(0,0,logicalWidth, logicalHeight); // Clear logical coordinates
          ctx.save();
          ctx.fillStyle=effectiveBg();
          ctx.fillRect(0,0,logicalWidth, logicalHeight);

          for(const s of strokes){
            if(!s)continue;
            ctx.globalCompositeOperation="source-over";
            if(s.tool==="pen"||s.tool==="eraser"){
              if (!s.p || s.p.length < 2) continue; // Need at least 2 points
              ctx.lineJoin=ctx.lineCap="round";
              ctx.lineWidth=s.w;
              ctx.strokeStyle=s.tool==="eraser"?"rgba(0,0,0,1)":s.c;
              ctx.globalCompositeOperation=s.tool==="eraser"?"destination-out":"source-over";
              ctx.beginPath();ctx.moveTo(s.p[0].x,s.p[0].y);
              // Draw segments for smoother lines
              for(let i = 1; i < s.p.length; i++){
                  ctx.lineTo(s.p[i].x, s.p[i].y);
              }
              ctx.stroke();
            }
            else if(s.tool==="text"){
              ctx.fillStyle=s.c;
              ctx.font=`${s.sz}px Roboto, sans-serif`;
              ctx.textAlign = 'left';
              ctx.textBaseline = 'top';
              s.lines.forEach((ln,i)=>ctx.fillText(ln,s.x,s.y+i*s.sz*1.2));
            }
            else if(s.tool==="fill"){
              ctx.fillStyle=s.color;
              ctx.fillRect(0,0,logicalWidth, logicalHeight);
            }
          }
          ctx.restore();
        };


        const saveLocal=debounce(()=>{try{localStorage.whiteboardStrokes=JSON.stringify(strokes)}catch(e){notify("Save failed: Storage full?",5000)}},400);

        /* pointer handlers */
        const start=e=>{
          if(e.type==='touchstart') e.preventDefault();
          const pos=getPos(e); if (!pos) return;
          commitText();
          if(currentTool==="text"){makeTextInput(pos);return;}
          drawing=true;
          currentStroke={tool:currentTool,c:colorPicker.value,w:+brushSel.value,p:[pos]};
          // Draw the starting dot
          ctx.save();
          ctx.setTransform(dpr,0,0,dpr,0,0); // Apply scaling
          ctx.fillStyle = currentStroke.tool === "eraser" ? effectiveBg() : currentStroke.c; // Use background for eraser dot
          ctx.globalCompositeOperation=currentStroke.tool==="eraser"?"destination-out":"source-over";
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, currentStroke.w / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        };

        const move=e=>{
          if(e.type==='touchmove') e.preventDefault();
          const pos = getPos(e); if (!pos) return;
          if(currentTool==="eraser")updateEraserPreview(e);
          if(!drawing||currentTool==="text"||!currentStroke)return;
          const prev=currentStroke.p.at(-1);
           if (!prev) return; // Should not happen if start worked

           // Only add point if moved significantly (optional, can smooth lines)
           // const dist = Math.hypot(pos.x - prev.x, pos.y - prev.y);
           // if (dist < 2) return;

          currentStroke.p.push(pos); // Add new point

          // Draw line segment from previous point to current point
           ctx.save();
           ctx.setTransform(dpr,0,0,dpr,0,0); // Apply scaling
           ctx.lineWidth=currentStroke.w;
           ctx.strokeStyle=currentStroke.tool==="eraser"?"rgba(0,0,0,1)":currentStroke.c;
           ctx.globalCompositeOperation=currentStroke.tool==="eraser"?"destination-out":"source-over";
           ctx.lineJoin = ctx.lineCap = 'round';
           ctx.beginPath();
           ctx.moveTo(prev.x,prev.y);
           ctx.lineTo(pos.x,pos.y);
           ctx.stroke();
           ctx.restore();
        };
        const end=()=>{
          hideEraserPreview();
          if(!drawing)return;
          drawing=false;
          if (currentStroke && currentStroke.p && currentStroke.p.length > 0) { // Keep even single points (dots)
           strokes.push(currentStroke);
           saveState(); // Save state after a stroke is completed
          }
          currentStroke = null; // Reset current stroke
          saveLocal();
        };

        /* text tool */
        let input=null;
        const makeTextInput=pos=>{
          if(input) commitText(); // Commit existing text if user clicks elsewhere
          input=document.createElement("textarea");
          input.id="text-input-overlay";
          const off=canvas.getBoundingClientRect();
          const scale = dpr; // Use devicePixelRatio for scaling
          input.style.left=(off.left+window.scrollX+pos.x)+"px"; // Position based on logical coords
          input.style.top =(off.top+window.scrollY +pos.y)+"px";
          input.style.fontSize = fontSel.value+"px"; // Use logical font size
          input.style.lineHeight = 1.2;
          input.style.fontFamily = 'Roboto, sans-serif';
          input.style.color=colorPicker.value;
          input.style.background = 'rgba(255, 255, 255, 0.8)';
          input.style.border = '1px dashed grey';
          input.style.padding = '2px';
          input.style.resize = 'none';
           input.style.minWidth = '50px'; // Minimum width
           input.style.minHeight = (parseFloat(fontSel.value) * 1.2 + 4) + 'px'; // Min height based on font size
           input.style.overflow = 'hidden'; // Hide scrollbars initially
           input.style.whiteSpace = 'pre-wrap'; // Handle line breaks
           input.style.zIndex = '25';

           // Auto-resize textarea
           input.addEventListener('input', () => {
                input.style.height = 'auto'; // Reset height
                input.style.height = input.scrollHeight + 'px';
                input.style.width = 'auto'; // Reset width
                input.style.width = input.scrollWidth + 'px';
           });

          input.onblur=commitText;
          input.onkeydown=e=>{
              if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();commitText();}
              else if (e.key === "Escape") { input.value = ''; commitText(); } // Allow escape to cancel
           };
          document.body.appendChild(input);
          // Small delay to ensure element is in DOM before focus/resize
          setTimeout(() => {
               input.focus();
               // Trigger initial size adjustment
               input.style.height = input.scrollHeight + 'px';
               input.style.width = Math.max(50, input.scrollWidth) + 'px';
          }, 0);
        };
        const commitText=()=>{
          if(!input)return;
          const txt=input.value;
          const off=canvas.getBoundingClientRect();
          const scale = dpr;
          const x = (parseFloat(input.style.left)-off.left-window.scrollX) ; // Position based on logical coordinates
          const y = (parseFloat(input.style.top )-off.top -window.scrollY) ;
          const sz = +fontSel.value;
          const col = colorPicker.value;
          document.body.removeChild(input);input=null;
          if(!txt.trim())return;
          strokes.push({tool:"text",lines:txt.split("\n"),x,y,sz,c:col});
          render();
          saveState(); // Save state after adding text
          saveLocal();
        };

        /* eraser preview */
        const updateEraserPreview=e=>{
          const p=getPos(e); if (!p) return;
           const size=+brushSel.value; // Logical size
           const previewSize = size * dpr; // Scale size for display
           const previewX = canvas.offsetLeft + p.x * dpr - previewSize / 2; // Scale position
           const previewY = canvas.offsetTop + p.y * dpr - previewSize / 2;
           eraserPreview.style.cssText=`display:block; border-radius:50%; border: 1px dashed grey; background: rgba(128,128,128,0.3); width:${previewSize}px; height:${previewSize}px; left:${previewX}px; top:${previewY}px; position: absolute; pointer-events: none; z-index: 30;`;
        };
        const hideEraserPreview=()=>eraserPreview.style.display="none";

        /* Cursors based on tool */
        const updateCursor = () => {
            canvas.classList.remove('pen-cursor', 'text-cursor', 'eraser-cursor');
            hideEraserPreview(); // Hide preview when changing tool
            if (currentTool === 'pen') canvas.classList.add('pen-cursor');
            else if (currentTool === 'text') canvas.classList.add('text-cursor');
            else if (currentTool === 'eraser') canvas.classList.add('eraser-cursor'); // We'll show preview on move
        };


        /* full-screen */
        fsBtn.onclick=()=>{
          if(!document.fullscreenElement){
             container.requestFullscreen().catch(()=>notify("Full-screen failed"));
          }else{
             document.exitFullscreen();
          }
        };
        document.addEventListener("fullscreenchange",()=>{
          const full=!!document.fullscreenElement;
          fsBtn.classList.toggle("full",full);
          fsBtn.innerHTML=`<i class="fas fa-${full?'compress':'expand'}"></i>`;
          fsBtn.setAttribute("aria-label",full?"Exit full screen (Esc)":"Full screen (⌘/Ctrl-F)");
          setTimeout(resizeCanvas, 150); // Increased delay slightly
        });

        /* hot-keys */
        addEventListener("keydown",e=>{
           // Ignore keydowns if focus is inside the text input overlay
          if (document.activeElement === input) return;

          const isModifier = e.metaKey || e.ctrlKey;

          if(isModifier && e.key.toLowerCase()==="s"){e.preventDefault();$(".save-button").click();}
          if(isModifier && e.key.toLowerCase()==="z"){e.preventDefault();undo();} // Call undo function
          if(isModifier && e.key.toLowerCase()==="f"){e.preventDefault();fsBtn.click();}
          // Tool hotkeys (ensure they don't clash with browser/OS shortcuts if modifier not used)
          if(!isModifier) {
               if(e.key.toLowerCase() === 'p') $$('.tool-button[data-tool="pen"]')[0]?.click();
               if(e.key.toLowerCase() === 't') $$('.tool-button[data-tool="text"]')[0]?.click();
               if(e.key.toLowerCase() === 'e') $$('.tool-button[data-tool="eraser"]')[0]?.click();
          }
        });

        /* UI wiring */
        canvas.addEventListener("mousedown",start);
        canvas.addEventListener("mousemove",move);
        canvas.addEventListener("mouseup",end);
        canvas.addEventListener("mouseleave",end);
        canvas.addEventListener("touchstart",start,{passive:false});
        canvas.addEventListener("touchmove",move,{passive:false});
        canvas.addEventListener("touchend",end);
        canvas.addEventListener("touchcancel",end);

        tools.forEach(b=>b.onclick=()=>{commitText();tools.forEach(x=>x.classList.remove("active"));b.classList.add("active");currentTool=b.dataset.tool; updateCursor();});

        $(".undo-button").onclick = undo; // Use undo function
        $(".clear-button").onclick= ()=>{strokes=[];render();saveState();saveLocal();notify("Cleared");}; // Save cleared state
        $(".fill-button").onclick  = ()=>{strokes.push({tool:"fill",color:colorPicker.value});render();saveState();saveLocal();notify("Background filled");};
        $(".save-button").onclick  = ()=>{saveLocal.flush?.();localStorage.setItem('whiteboardStrokes', JSON.stringify(strokes)); notify("Saved");};
        $(".load-button").onclick  = ()=>{
          let raw=localStorage.whiteboardStrokes;
          try{
              strokes=raw?JSON.parse(raw):[];
              history = [{ strokes: JSON.parse(JSON.stringify(strokes)), bgColor: effectiveBg() }]; // Reset history
              historyIndex = 0;
          }catch{strokes=[]; history=[{strokes:[], bgColor: themeBg()}]; historyIndex = 0;}
          render();notify(strokes.length?"Loaded":"Nothing saved");
        };
        $(".export-png-button").onclick=()=>{
           try {
             // Create a temporary canvas to draw without DPR scaling for export
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                const exportWidth = canvas.clientWidth; // Logical dimensions
                const exportHeight = canvas.clientHeight;
                tempCanvas.width = exportWidth;
                tempCanvas.height = exportHeight;

                // Draw background
                 tempCtx.fillStyle=effectiveBg();
                 tempCtx.fillRect(0,0,exportWidth, exportHeight);

                // Draw strokes onto temp canvas without DPR scaling
                strokes.forEach(s => {
                     if(!s) return;
                     tempCtx.globalCompositeOperation = "source-over";
                     if(s.tool==="pen"||s.tool==="eraser"){
                       if (!s.p || s.p.length < 2) return;
                       tempCtx.lineJoin = tempCtx.lineCap = "round";
                       tempCtx.lineWidth = s.w; // Use logical width
                       tempCtx.strokeStyle = s.tool === "eraser" ? "rgba(0,0,0,1)" : s.c;
                       tempCtx.globalCompositeOperation = s.tool === "eraser" ? "destination-out" : "source-over";
                       tempCtx.beginPath(); tempCtx.moveTo(s.p[0].x, s.p[0].y);
                       for(let i = 1; i < s.p.length; i++){ tempCtx.lineTo(s.p[i].x, s.p[i].y); }
                       tempCtx.stroke();
                     } else if(s.tool==="text"){
                       tempCtx.fillStyle = s.c;
                       tempCtx.font = `${s.sz}px Roboto, sans-serif`; // Use logical size
                       tempCtx.textAlign = 'left'; tempCtx.textBaseline = 'top';
                       s.lines.forEach((ln,i)=>tempCtx.fillText(ln,s.x,s.y+i*s.sz*1.2));
                     } // Fill is already handled by background
                });

                // Export from temp canvas
                const a=document.createElement("a");
                a.href=tempCanvas.toDataURL("image/png");
                a.download="morrisons-notes.png";
                a.click();notify("PNG downloaded");
            } catch(e) {
                console.error("Error exporting PNG:", e);
                notify("Error exporting PNG", 4000);
            }
        };

        /* initial load */
        window.addEventListener("resize",debounce(resizeCanvas,150)); // Shortened debounce

    } else { console.log("Whiteboard canvas not found."); } // End if(canvas)


    /* --- Lazy Load Iframes & Add Spinners --- */
     function initLazyIframes() {
         const iframes = document.querySelectorAll('iframe[data-src]');

         const observerCallback = (entries, obs) => {
             entries.forEach(entry => {
                 if (entry.isIntersecting) {
                     const iframe = entry.target;
                     const loadingContainer = iframe.closest('section')?.querySelector('.iframe-loading-container');
                     const loader = loadingContainer?.querySelector('.iframe-loading');

                     if (loader) {
                          loader.style.display = 'block';
                      }
                     iframe.src = iframe.getAttribute('data-src');
                     iframe.removeAttribute('data-src');

                     iframe.addEventListener('load', () => { if(loader) loader.style.display = 'none';});
                     iframe.addEventListener('error', (err) => {
                         if(loader) loader.style.display = 'none';
                         console.error("Error loading iframe:", iframe.title || iframe.src, err);
                         const errorMsg = document.createElement('p');
                         errorMsg.textContent = 'Error loading content.';
                         errorMsg.style.textAlign = 'center';
                         errorMsg.style.padding = '20px';
                         errorMsg.style.color = 'red';
                         const iframeWrapper = iframe.closest('.iframe-wrap');
                         if(iframeWrapper && !iframeWrapper.querySelector('.error-message')) {
                             errorMsg.classList.add('error-message');
                             iframeWrapper.appendChild(errorMsg);
                         }
                     });

                     obs.unobserve(iframe);
                 }
             });
         };

          const observerOptions = {
            rootMargin: '100px 0px',
            threshold: 0.01
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);

        iframes.forEach(iframe => {
            const loadingContainer = iframe.closest('section')?.querySelector('.iframe-loading-container');
            const loader = loadingContainer?.querySelector('.iframe-loading');

            if(loader) {
                loader.style.display = 'none'; // Hide initially
            }

            if ('IntersectionObserver' in window) {
                observer.observe(iframe);
            } else {
                // Fallback for browsers without IntersectionObserver
                if (loader) loader.style.display = 'block';
                iframe.src = iframe.getAttribute('data-src');
                iframe.removeAttribute('data-src');
                iframe.addEventListener('load', () => { if(loader) loader.style.display = 'none'; });
                iframe.addEventListener('error', () => { if(loader) loader.style.display = 'none'; });
            }
        });
    }

    /* -------- Simple Site Search -------- */
    const searchInput = document.getElementById('site-search');
    const searchResultsContainer = document.getElementById('search-results');

    // Define the searchable content (manual index)
    const searchablePages = [
        { title: 'Home / Dashboard', url: 'index.html', keywords: 'dashboard welcome quick links rota whiteboard notes' },
        { title: 'Online Operations', url: 'online.html', keywords: 'cnc click collect amazon deliveroo justeat uber eats osp partner handset troubleshoot' },
        { title: 'Market Street / Cafe', url: 'street.html', keywords: 'bakery butchery fish deli cake shop pizza food to go cafe production plan checklist wgll markdown' },
        { title: 'Front End Services', url: 'services.html', keywords: 'csd kiosk checkouts sco self scan tills more card trolleys baskets pharmacy logbook mpro5' },
        { title: 'Operations', url: 'operations.html', keywords: 'replenishment scanning mic routines tech support it helpdesk emergency' },
        { title: 'Contacts', url: 'contacts.html', keywords: 'phone email helpdesk support central loss prevention lp retail trust pharmacy' },
        { title: 'Shrink Management', url: 'shrink.html', keywords: 'stocktake audit tagging waste loss prevention dymension think shrink' },
        { title: 'Safe & Legal', url: 'safe-and-legal.html', keywords: 'haccp food safety health hs licensing compliance audits data protection gdpr' }
    ];

    const handleSearch = debounce(() => {
        const query = searchInput.value.trim().toLowerCase();
        searchResultsContainer.innerHTML = ''; // Clear previous results

        if (query.length < 2) { // Only search if query is at least 2 chars
            searchResultsContainer.style.display = 'none';
            return;
        }

        const results = searchablePages.filter(page =>
            page.title.toLowerCase().includes(query) ||
            page.keywords.toLowerCase().includes(query) ||
            page.url.toLowerCase().includes(query)
        );

        if (results.length > 0) {
             // Limit results displayed
            const maxResults = 7;
            results.slice(0, maxResults).forEach(result => {
                const link = document.createElement('a');
                link.href = result.url;
                link.textContent = result.title;
                searchResultsContainer.appendChild(link);
            });
            searchResultsContainer.style.display = 'block';
        } else {
            const noResult = document.createElement('div');
             noResult.textContent = 'No results found.';
             noResult.style.padding = '0.75rem 1rem'; // Style similar to links
             searchResultsContainer.appendChild(noResult);
            searchResultsContainer.style.display = 'block';
        }
    }, 300); // Debounce search input

    if (searchInput && searchResultsContainer) {
        searchInput.addEventListener('input', handleSearch);

        // Hide results when clicking outside
        document.addEventListener('click', (event) => {
             // Check if the click target is the search input or the results container itself
            if (!searchInput.contains(event.target) && !searchResultsContainer.contains(event.target)) {
                searchResultsContainer.style.display = 'none';
            }
        });
         // Hide results on Escape key
         searchInput.addEventListener('keydown', (event) => {
             if (event.key === 'Escape') {
                 searchResultsContainer.style.display = 'none';
                 searchInput.blur(); // Optionally remove focus from input
             }
         });
          // Ensure results are shown if input gains focus and has value > 1 char
         searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim().length >= 2) {
                handleSearch.flush?.(); // Ensure immediate search if debounced
                 if (searchResultsContainer.innerHTML.trim() !== '') { // Check if results exist
                     searchResultsContainer.style.display = 'block';
                }
            }
         });

    }
    /* -------- End Search -------- */


    /* --- DOMContentLoaded --- */
    const initPage = () => {
        // Ensure page starts at the very top
        window.scrollTo(0, 0);

        // Dark mode init
        const saved=localStorage.theme;setMode(saved?saved==="dark":matchMedia("(prefers-color-scheme:dark)").matches);

        // Lazy iframe init
        initLazyIframes();

         // Whiteboard init (ensure canvas exists)
         if(canvas) {
            resizeCanvas(); // Initial size calculation
            updateCursor(); // Set initial cursor state
            // Load initial state if needed
            if (localStorage.whiteboardStrokes) {
                try {
                   strokes = JSON.parse(localStorage.whiteboardStrokes);
                   history = [{ strokes: JSON.parse(JSON.stringify(strokes)), bgColor: effectiveBg() }];
                   historyIndex = 0;
                   render();
                } catch {
                    strokes = [];
                    history = [{ strokes: [], bgColor: themeBg() }];
                    historyIndex = 0;
                }
            } else {
                 history = [{ strokes: [], bgColor: themeBg() }]; // Initialize history for a blank canvas
                 historyIndex = 0;
            }
         }

        // --- Removed hash linking scroll logic ---

    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPage);
    } else {
        initPage();
    }

    /* --- Dark Mode System Preference Listener --- */
    matchMedia("(prefers-color-scheme:dark)").addEventListener("change",e=>{if(!localStorage.theme)setMode(e.matches);});


    /* --- PWA Service Worker Registration --- */
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('Service Worker registered successfully with scope: ', registration.scope);
          })
          .catch(err => {
            console.error('Service Worker registration failed: ', err);
          });
      });
    }

  })(); // End IIFE
