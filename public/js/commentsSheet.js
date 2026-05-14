(function(){
  const backdrop = document.getElementById('comments-backdrop');
  const sheet = document.getElementById('comments-sheet');
  const closeBtn = document.getElementById('close-comments');
  const commentsList = document.getElementById('comments-list');
  const commentForm = document.getElementById('comment-form');
  const commentInput = document.getElementById('comment-input');
  let __currentPostIndex = null;

  const submitBtn = document.getElementById('comment-submit');

  function updateSubmitState(){
    const loggedIn = !!(window && window.currentUser);
    if(!submitBtn) return;
    if(!loggedIn){
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.5';
      return;
    }
    const hasText = commentInput && commentInput.value && commentInput.value.trim().length > 0;
    submitBtn.disabled = !hasText;
    submitBtn.style.opacity = submitBtn.disabled ? '0.6' : '1';
  }
  if(commentInput){
    commentInput.addEventListener('input', updateSubmitState);
  }
  // initial state
  updateSubmitState();

  function openSheet({postIndex}){
    const posts = window.postsData || [];
    const post = posts[postIndex];
    __currentPostIndex = postIndex;
    // populate comments only
    commentsList.innerHTML = '';
    const comments = (post && post.comments) ? post.comments : [];
    if(comments.length === 0){
      commentsList.innerHTML = '<p>No comments yet.</p>';
    } else {
      const frag = document.createDocumentFragment();
      comments.forEach(c => {
        const div = document.createElement('div');
        div.className = 'comment-item d-flex gap-2 align-items-start';
        const name = (c.user && (c.user.name || c.user.username)) || c.author || c.name || 'Unknown';
        const text = c.text || c.body || c.content || '';
        // build basic content
        let inner = `<div style="flex:0 0 40px"><img src="${(c.user && c.user.profilePic) ? ( (typeof c.user.profilePic === 'string') ? c.user.profilePic : (c.user.profilePic.url || '/assets/userProfilePic.png') ) : '/assets/userProfilePic.png'}" alt="u" style="width:36px;height:36px;border-radius:50%;object-fit:cover"/></div><div style="flex:1"><strong>${escapeHtml(name)}</strong><div>${escapeHtml(text)}</div></div>`;
        // show delete button if current user is comment author or post owner
        try{
          const currentUser = window.currentUser || null;
          const postOwnerId = post && post.user && (post.user._id || post.user);
          const commentUserId = c.user && (c.user._id || c.user);
          const canDelete = currentUser && (String(currentUser._id) === String(commentUserId) || String(currentUser._id) === String(postOwnerId));
          if(canDelete){
            inner += `<div style="flex:0 0 auto; margin-left:8px"><button class="comment-delete-btn btn btn-sm" data-post-id="${post._id || post.id}" data-comment-id="${c._id || c.id}" style="background:transparent;border:none;color:#c02626;">Delete</button></div>`;
          }
        } catch(err){/* ignore */}
        div.innerHTML = inner;
        frag.appendChild(div);
      });
      commentsList.appendChild(frag);
    }

    // show
    backdrop.classList.add('active');
    sheet.classList.add('active');
    backdrop.setAttribute('aria-hidden','false');
    sheet.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';

    // prevent touchmove from scrolling background while allowing sheet-body scroll
    function preventScroll(e){
      if(!e.target.closest('#comments-sheet .sheet-body')){
        e.preventDefault();
      }
    }
    document.__preventTouch = preventScroll;
    document.addEventListener('touchmove', preventScroll, {passive:false});
  }

  function closeSheet(){
    backdrop.classList.remove('active');
    sheet.classList.remove('active');
    backdrop.setAttribute('aria-hidden','true');
    sheet.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    // pause any playing video inside sheet
    const v = sheet.querySelector('video');
    if(v && !v.paused) v.pause();
    // remove touch prevent handler
    if(document.__preventTouch){
      document.removeEventListener('touchmove', document.__preventTouch, {passive:false});
      document.__preventTouch = null;
    }
  }

  function escapeHtml(unsafe){
    if(!unsafe && unsafe !== 0) return '';
    return String(unsafe).replace(/[&<>"]+/g, function(match){
      switch(match){
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        default: return match;
      }
    });
  }

  // delegate clicks for open buttons
  document.addEventListener('click', function(e){
    const btn = e.target.closest('.open-comments-btn');
    if(!btn) return;
    e.preventDefault();
    const postIndex = Number(btn.dataset.postIndex);
    openSheet({postIndex});
  });

  // handle comment submit
  if(commentForm){
    commentForm.addEventListener('submit', async function(e){
      e.preventDefault();
      // require login
      if(!(window && window.currentUser)){
        window.location = '/login';
        return;
      }
      const text = (commentInput && commentInput.value || '');
      // keep spaces inside text, only trim for emptiness
      if(!text || !text.trim()) return;
      const trimmed = text.trim();
      const posts = window.postsData || [];
      const post = posts[__currentPostIndex];
      if(!post) return;
      const postId = post._id || post.id;
      const submitBtn = document.getElementById('comment-submit');
      submitBtn.disabled = true;
      try{
        const res = await fetch('/post/' + postId + '/comment/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ text: trimmed })
        });
        const data = await res.json();
        if(res.ok && data && data.success){
          const c = data.comment;
          // append to comments list
          const div = document.createElement('div');
          div.className = 'comment-item d-flex gap-2 align-items-start';
          const name = (c.user && (c.user.name)) || 'You';
          const profile = (c.user && c.user.profilePic) || '/assets/userProfilePic.png';
          div.innerHTML = `<div style="flex:0 0 40px"><img src="${profile}" alt="u" style="width:36px;height:36px;border-radius:50%;object-fit:cover"/></div><div style="flex:1"><strong>${escapeHtml(name)}</strong><div>${escapeHtml(c.text)}</div></div>`;
          commentsList.appendChild(div);
          // clear input
          commentInput.value = '';
          updateSubmitState();
          // update comment count in feed
          const feedBtn = document.querySelector('.open-comments-btn[data-post-id="' + postId + '"]');
          if(feedBtn){
            const countSpan = feedBtn.querySelector('.comment-count');
            if(countSpan){
              const n = Number(countSpan.textContent || 0) + 1;
              countSpan.textContent = n;
            }
          }
          // also update local postsData
          if(!post.comments) post.comments = [];
          post.comments.push(c);
        } else {
          console.warn('Comment post failed', data);
        }
      } catch(err){
        console.error(err);
      } finally{
        submitBtn.disabled = false;
      }
    });
  }

  // delegate delete clicks on comments list
  if(commentsList){
    commentsList.addEventListener('click', async function(e){
      const btn = e.target.closest('.comment-delete-btn');
      if(!btn) return;
      const commentId = btn.dataset.commentId;
      const postId = btn.dataset.postId;
      if(!commentId || !postId) return;
      if(!confirm('Delete this comment?')) return;
      try{
        btn.disabled = true;
        const res = await fetch('/post/' + postId + '/comment/' + commentId + '/delete', {
          method: 'DELETE',
          credentials: 'same-origin',
          headers: { 'Accept': 'application/json' }
        });
        const data = await res.json();
        if(res.ok && data && data.success){
          // remove from DOM
          const item = btn.closest('.comment-item');
          if(item) item.remove();
          // update local postsData and feed count
          const posts = window.postsData || [];
          const p = posts.find(x => String(x._id) === String(postId) || String(x.id) === String(postId));
          if(p && Array.isArray(p.comments)){
            const idx = p.comments.findIndex(c => String(c._id || c.id) === String(commentId));
            if(idx !== -1) p.comments.splice(idx,1);
          }
          const feedBtn = document.querySelector('.open-comments-btn[data-post-id="' + postId + '"]');
          if(feedBtn){
            const countSpan = feedBtn.querySelector('.comment-count');
            if(countSpan){
              const n = Math.max(0, Number(countSpan.textContent || 0) - 1);
              countSpan.textContent = n;
            }
          }
        } else {
          console.warn('Delete failed', data);
        }
      } catch(err){
        console.error(err);
      } finally{
        btn.disabled = false;
      }
    });
  }

  backdrop.addEventListener('click', closeSheet);
  closeBtn.addEventListener('click', closeSheet);
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeSheet(); });
})();
