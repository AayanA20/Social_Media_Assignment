import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, MessageCircle, Share2, Search, Plus, Coins, Bell, Moon, Sun, 
  Camera, Smile, Image, Send, LogOut, Check, ChevronDown, MessageSquare, 
  Home, ClipboardList, Share, Trophy, MessageCircleMore
} from 'lucide-react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';

const Dashboard = () => {
  const { user, token, logout, refreshProfile } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  
  // Create Post States
  const [postText, setPostText] = useState('');
  const [postImageFile, setPostImageFile] = useState(null);
  const [postImageUrl, setPostImageUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All Post');
  const [activeNav, setActiveNav] = useState('Social');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [expandedComments, setExpandedComments] = useState({}); // { postId: boolean }
  const [commentInputs, setCommentInputs] = useState({}); // { postId: text }
  const [followingUsers, setFollowingUsers] = useState({}); // { userId: boolean }

  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const createPostRef = useRef(null);

  // Emojis list
  const emojis = ['😊', '🔥', '👍', '🎉', '❤️', '😂', '🙌', '✨', '⭐', '💡'];

  // Toggle Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Click outside dropdown handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Posts
  const fetchPosts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/posts`);
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      showToast('Error loading posts feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // Show Toast Helper
  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  // Theme Toggler
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Image Upload Handle
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image size must be less than 5MB');
        return;
      }
      setPostImageFile(file);
      setPostImageUrl(''); // clear url input if file uploaded
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSelectedImage = () => {
    setPostImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Emoji Append Helper
  const appendEmoji = (emoji) => {
    setPostText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Submit Post
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!postText.trim() && !postImageFile && !postImageUrl.trim()) {
      showToast('Please add text or an image');
      return;
    }

    try {
      setSubmittingPost(true);
      
      const formData = new FormData();
      formData.append('text', postText);
      
      if (postImageFile) {
        formData.append('image', postImageFile);
      } else if (postImageUrl.trim()) {
        formData.append('imageUrl', postImageUrl.trim());
      }

      const response = await fetch(`${API_BASE_URL}/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const newPost = await response.json();
        setPosts(prev => [newPost, ...prev]);
        setPostText('');
        removeSelectedImage();
        setPostImageUrl('');
        setShowUrlInput(false);
        showToast('Post created successfully!');
        
        // Refresh coins/earnings on posting
        refreshProfile();
      } else {
        const errData = await response.json();
        showToast(errData.message || 'Error creating post');
      }
    } catch (error) {
      console.error(error);
      showToast('Failed to connect to backend server');
    } finally {
      setSubmittingPost(false);
    }
  };

  // Like Post
  const handleLikePost = async (postId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPosts(prev => prev.map(post => post._id === postId ? updatedPost : post));
      }
    } catch (error) {
      console.error(error);
      showToast('Error liking post');
    }
  };

  // Expand comments toggle
  const toggleComments = (postId) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  // Handle Comment Submission
  const handleAddComment = async (e, postId) => {
    e.preventDefault();
    const commentText = commentInputs[postId];
    if (!commentText || !commentText.trim()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/posts/${postId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: commentText })
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPosts(prev => prev.map(post => post._id === postId ? updatedPost : post));
        setCommentInputs(prev => ({ ...prev, [postId]: '' }));
        showToast('Comment added +5 Coins earned!');
        refreshProfile();
      }
    } catch (error) {
      console.error(error);
      showToast('Error adding comment');
    }
  };

  // Toggle Follow
  const handleToggleFollow = (userId, authorName) => {
    setFollowingUsers(prev => {
      const isFollowing = !prev[userId];
      showToast(isFollowing ? `Following @${authorName}` : `Unfollowed @${authorName}`);
      return {
        ...prev,
        [userId]: isFollowing
      };
    });
  };

  // Scroll to Create Post
  const scrollToCreatePost = () => {
    if (createPostRef.current) {
      createPostRef.current.scrollIntoView({ behavior: 'smooth' });
      // Focus textarea
      setTimeout(() => {
        const textarea = createPostRef.current.querySelector('textarea');
        if (textarea) textarea.focus();
      }, 500);
    }
  };

  // Filtering Posts
  const filteredPosts = posts.filter(post => {
    // Search filter
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      post.text.toLowerCase().includes(query) || 
      post.user.name.toLowerCase().includes(query) || 
      post.user.username.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    // Tab filter
    if (activeFilter === 'For You') {
      // Show posts from users you follow
      return followingUsers[post.user._id] === true;
    }
    return true;
  });

  // Sort filtered posts based on metrics
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (activeFilter === 'Most Liked') {
      return b.likes.length - a.likes.length;
    }
    if (activeFilter === 'Most Commented') {
      return b.comments.length - a.comments.length;
    }
    // Default: Date Newest
    return 0; // maintain original chronological order from fetch
  });

  return (
    <div className="app-wrapper">
      {/* Header */}
      <header className="main-header">
        <div className="header-top">
          <h1 className="header-title">Social</h1>
          
          <div className="header-stats">
            <div className="stat-badge coins" title="Your Coins balance">
              <Coins size={16} />
              <span>{user?.coins || 100}</span>
            </div>
            <div className="stat-badge earnings" title="Your Cash earnings">
              <span>₹{user?.earnings !== undefined ? user.earnings.toFixed(2) : '0.00'}</span>
            </div>
          </div>

          <div className="header-actions">
            {/* Theme Toggle */}
            <button className="action-btn" onClick={toggleTheme}>
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            
            {/* Notifications */}
            <button className="action-btn" onClick={() => showToast('No new notifications')}>
              <Bell size={18} />
            </button>

            {/* Profile Dropdown */}
            <div className="user-menu-container" ref={dropdownRef}>
              <img 
                src={user?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.username}`} 
                alt="Profile" 
                className="avatar-img"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
              />
              {showUserDropdown && (
                <div className="dropdown-menu">
                  <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)', fontSize: '12px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{user?.name}</div>
                    <div style={{ color: 'var(--text-muted)' }}>@{user?.username}</div>
                  </div>
                  <button className="dropdown-item" onClick={logout}>
                    <LogOut size={16} />
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search promotions, users, posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1 }}>
        {/* Create Post Card */}
        <div className="create-post-card" ref={createPostRef}>
          <div className="create-post-header">Create Post</div>
          
          <textarea
            className="create-post-input"
            placeholder="What's on your mind?"
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            disabled={submittingPost}
          />

          {imagePreview && (
            <div className="image-preview-container">
              <img src={imagePreview} alt="Upload Preview" className="image-preview" />
              <button className="remove-image-btn" onClick={removeSelectedImage} type="button">
                &times;
              </button>
            </div>
          )}

          {showUrlInput && (
            <div className="url-input-container">
              <Image size={16} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Paste image URL here..."
                className="url-text-input"
                value={postImageUrl}
                onChange={(e) => {
                  setPostImageUrl(e.target.value);
                  setImagePreview(e.target.value); // Optimistically preview URL
                }}
              />
            </div>
          )}

          {showEmojiPicker && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px' }}>
              {emojis.map(emoji => (
                <button 
                  key={emoji} 
                  type="button" 
                  onClick={() => appendEmoji(emoji)}
                  style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', padding: '4px' }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <div className="create-post-footer">
            <div className="attachment-actions">
              {/* Photo Upload trigger */}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                ref={fileInputRef}
                style={{ display: 'none' }}
              />
              <button 
                type="button" 
                className="attach-btn" 
                onClick={() => fileInputRef.current.click()}
                title="Upload Photo"
                disabled={submittingPost}
              >
                <Camera size={20} />
              </button>

              {/* Paste URL Trigger */}
              <button 
                type="button" 
                className="attach-btn" 
                onClick={() => setShowUrlInput(!showUrlInput)}
                title="Add Image Link"
                disabled={submittingPost}
              >
                <Image size={20} />
              </button>

              {/* Emoji Picker trigger */}
              <button 
                type="button" 
                className="attach-btn" 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                title="Add Emoji"
                disabled={submittingPost}
              >
                <Smile size={20} />
              </button>
            </div>

            <button 
              type="button" 
              className="post-submit-btn" 
              onClick={handleCreatePost}
              disabled={submittingPost || (!postText.trim() && !postImageFile && !postImageUrl.trim())}
            >
              {submittingPost ? 'Posting...' : <><Send size={14} /> Post</>}
            </button>
          </div>
        </div>

        {/* Filter Categories */}
        <div className="filters-container">
          {['All Post', 'For You', 'Most Liked', 'Most Commented'].map(filterName => (
            <button
              key={filterName}
              className={`filter-tab ${activeFilter === filterName ? 'active' : ''}`}
              onClick={() => setActiveFilter(filterName)}
            >
              {filterName}
            </button>
          ))}
        </div>

        {/* Posts Feed */}
        <div className="posts-feed">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Loading posts feed...
            </div>
          ) : sortedPosts.length === 0 ? (
            <div className="empty-state">
              <MessageSquare size={48} />
              <p style={{ fontWeight: 600 }}>No posts found</p>
              <p style={{ fontSize: '13px' }}>
                {activeFilter === 'For You' 
                  ? 'Posts from users you follow will appear here. Try following someone first!' 
                  : 'Be the first to create a post!'}
              </p>
            </div>
          ) : (
            sortedPosts.map(post => {
              const isLiked = post.likes.some(like => like.userId === user?._id);
              const isCreator = post.user?._id === user?._id;
              const isFollowing = followingUsers[post.user?._id] || false;
              const formattedDate = new Date(post.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <article key={post._id} className="post-card">
                  {/* Pin Gold badge to mimic image styling */}
                  {post.likes.length >= 5 && <div className="post-badge">Trending</div>}
                  
                  <div className="post-header">
                    <div className="post-author-info">
                      <img 
                        src={post.user?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${post.user?.username}`} 
                        alt={post.user?.name} 
                        className="author-avatar"
                      />
                      <div className="author-names">
                        <span className="author-name">
                          {post.user?.name || 'Anonymous'}
                          {isCreator && <span style={{ fontSize: '10px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px' }}>You</span>}
                        </span>
                        <span className="author-username">@{post.user?.username || 'user'}</span>
                        <span className="post-date">{formattedDate}</span>
                      </div>
                    </div>

                    {!isCreator && (
                      <button 
                        className={`follow-btn ${isFollowing ? 'following' : ''}`}
                        onClick={() => handleToggleFollow(post.user?._id, post.user?.username)}
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>

                  {post.text && <p className="post-content">{post.text}</p>}

                  {post.imageUrl && (
                    <div className="post-image-container">
                      <img 
                        src={post.imageUrl.startsWith('/') ? `http://localhost:5000${post.imageUrl}` : post.imageUrl} 
                        alt="Post attachment" 
                        className="post-image"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none'; // hide broken images gracefully
                        }}
                      />
                    </div>
                  )}

                  {/* Actions (Like/Comment/Share) */}
                  <div className="post-actions">
                    <button 
                      className={`action-trigger ${isLiked ? 'liked' : ''}`}
                      onClick={() => handleLikePost(post._id)}
                    >
                      <Heart size={18} />
                      <span>{post.likes.length} Likes</span>
                    </button>

                    <button 
                      className="action-trigger"
                      onClick={() => toggleComments(post._id)}
                    >
                      <MessageCircle size={18} />
                      <span>{post.comments.length} Comments</span>
                    </button>

                    <button 
                      className="action-trigger"
                      onClick={() => {
                        navigator.clipboard.writeText(post.text);
                        showToast('Post text copied to clipboard!');
                      }}
                    >
                      <Share2 size={18} />
                      <span>Copy</span>
                    </button>
                  </div>

                  {/* Expandable Comments Drawer */}
                  {expandedComments[post._id] && (
                    <div className="comments-section">
                      <div className="comments-list">
                        {post.comments.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
                            No comments yet. Write one below!
                          </div>
                        ) : (
                          post.comments.map((comment, index) => (
                            <div key={index} className="comment-item">
                              <div className="comment-author">
                                <span>@{comment.username}</span>
                                <span className="comment-time">
                                  {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="comment-text">{comment.text}</p>
                            </div>
                          ))
                        )}
                      </div>

                      <form className="comment-form" onSubmit={(e) => handleAddComment(e, post._id)}>
                        <input
                          type="text"
                          className="comment-form-input"
                          placeholder="Write a comment..."
                          value={commentInputs[post._id] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCommentInputs(prev => ({ ...prev, [post._id]: val }));
                          }}
                        />
                        <button type="submit" className="comment-submit-btn">
                          <Send size={14} />
                        </button>
                      </form>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </main>

      {/* Floating Plus Button (Scrolls to post area) */}
      <button 
        className="floating-plus-btn" 
        onClick={scrollToCreatePost}
        title="Create New Post"
      >
        <Plus size={24} />
      </button>

      {/* Bottom Navigation (Fixed) */}
      <nav className="bottom-nav">
        <button 
          className={`nav-item ${activeNav === 'Home' ? 'active' : ''}`}
          onClick={() => { setActiveNav('Home'); showToast('Navigated Home'); }}
        >
          <Home size={20} />
          <span>Home</span>
        </button>

        <button 
          className={`nav-item ${activeNav === 'Tasks' ? 'active' : ''}`}
          onClick={() => { setActiveNav('Tasks'); showToast('Navigated Tasks'); }}
        >
          <ClipboardList size={20} />
          <span>Tasks</span>
        </button>

        <button 
          className={`nav-item ${activeNav === 'Social' ? 'active' : ''}`}
          onClick={() => setActiveNav('Social')}
        >
          <Share size={20} />
          <span>Social</span>
        </button>

        <button 
          className={`nav-item ${activeNav === 'Leader' ? 'active' : ''}`}
          onClick={() => { setActiveNav('Leader'); showToast('Navigated Leader Board'); }}
        >
          <Trophy size={20} />
          <span>Leader Board</span>
        </button>

        <button 
          className={`nav-item ${activeNav === 'Chat' ? 'active' : ''}`}
          onClick={() => { setActiveNav('Chat'); showToast('Navigated Chat'); }}
        >
          <MessageCircleMore size={20} />
          <span>Chat</span>
        </button>
      </nav>

      {/* Global Action Toast Notification */}
      {toastMessage && <div className="toast-msg">{toastMessage}</div>}
    </div>
  );
};

export default Dashboard;
