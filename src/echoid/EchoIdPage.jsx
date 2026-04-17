import React, { useMemo, useState } from "react";
import {
  Bell,
  ChevronRight,
  CircleUserRound,
  Compass,
  Filter,
  Home,
  Image as ImageIcon,
  Menu,
  MessageSquarePlus,
  Search,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import "./EchoIdPage.css";

const postSeed = [
  {
    id: "p1",
    author: "visual_noise",
    handle: "@visual.noise",
    minutesAgo: 5,
    category: "SYSTEM",
    content:
      "Observed a low-glow pulse across the downtown grid. Tracking the light trail before it folds back into the skyline.",
    image:
      "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80",
    vibes: 19,
    replies: 8,
    echoes: 4,
  },
  {
    id: "p2",
    author: "cipher_coda",
    handle: "@cipher.coda",
    minutesAgo: 14,
    category: "SIGNAL",
    content:
      "The city hum changes after midnight. If you listen long enough, every alley starts sounding like encrypted weather.",
    image: "",
    vibes: 13,
    replies: 11,
    echoes: 6,
  },
  {
    id: "p3",
    author: "pulse_archive",
    handle: "@pulse.archive",
    minutesAgo: 32,
    category: "REPORT",
    content:
      "A burned halo opened above sector nine and stayed there for exactly ninety seconds. Nobody nearby agreed on the color.",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    vibes: 27,
    replies: 15,
    echoes: 9,
  },
];

const trendSeed = [
  { id: "t1", label: "Silent towers", posts: 128 },
  { id: "t2", label: "Neon rainfall", posts: 76 },
  { id: "t3", label: "Grid anomaly", posts: 44 },
  { id: "t4", label: "Midnight ciphers", posts: 29 },
];

const alertSeed = [
  {
    id: "a1",
    title: "Echo nearby",
    copy: "A new post was published two blocks from your saved zone.",
    minutesAgo: 3,
    tone: "info",
  },
  {
    id: "a2",
    title: "Reply spike",
    copy: "Your latest signal picked up 12 new replies in the last hour.",
    minutesAgo: 19,
    tone: "accent",
  },
  {
    id: "a3",
    title: "Watch alert",
    copy: "Sector 9 entered elevated anomaly status. Filters updated automatically.",
    minutesAgo: 54,
    tone: "warning",
  },
];

const profileStats = [
  { label: "Echoes", value: "184" },
  { label: "Followers", value: "2.4k" },
  { label: "Signals", value: "12%" },
];

const tabs = [
  { id: "home", label: "Home", icon: Home },
  { id: "search", label: "Search", icon: Search },
  { id: "echo", label: "Echo", icon: MessageSquarePlus, isPrimary: true },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "profile", label: "Profile", icon: CircleUserRound },
];

const drawerSections = [
  {
    title: "Category",
    items: ["Notice", "Signals", "Reports", "Public boards"],
  },
  {
    title: "Discover",
    items: ["Saved filters", "Local watch", "Trending fields"],
  },
];

const formatRelativeTime = (minutesAgo) => {
  if (minutesAgo < 60) {
    return `${minutesAgo} min ago`;
  }

  const hours = Math.floor(minutesAgo / 60);
  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
};

const renderPostCard = (post) => (
  <article key={post.id} className="echoid-post-card">
    <div className="echoid-post-top">
      <div>
        <h3>{post.author}</h3>
        <div className="echoid-post-meta">
          <span>{post.handle}</span>
          <span>{formatRelativeTime(post.minutesAgo)}</span>
        </div>
      </div>
      <span className="echoid-post-tag">{post.category}</span>
    </div>

    <p>{post.content}</p>

    {post.image ? (
      <div className="echoid-post-imagewrap">
        <img src={post.image} alt={post.author} className="echoid-post-image" />
      </div>
    ) : null}

    <div className="echoid-post-actions">
      <button type="button">Vibe {post.vibes}</button>
      <button type="button">Reply {post.replies}</button>
      <button type="button">Echo {post.echoes}</button>
    </div>
  </article>
);

export default function EchoIdPage() {
  const [activeTab, setActiveTab] = useState("home");
  const [query, setQuery] = useState("");
  const [composeText, setComposeText] = useState("");
  const [selectedTrend, setSelectedTrend] = useState("Silent towers");
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return postSeed;

    return postSeed.filter((post) =>
      [post.author, post.handle, post.category, post.content]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [query]);

  const renderHome = () => (
    <div className="echoid-feed">
      <section className="echoid-hero-card">
        <div>
          <div className="echoid-section-label">Live frequency</div>
          <h2>Signals moving through the city right now.</h2>
        </div>
        <div className="echoid-stat-row">
          {profileStats.map((item) => (
            <div key={item.label} className="echoid-stat-pill">
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="echoid-section">
        <div className="echoid-section-heading">
          <span className="echoid-section-label">Fresh posts</span>
          <button type="button">Refresh</button>
        </div>
        {postSeed.map(renderPostCard)}
      </section>
    </div>
  );

  const renderSearch = () => (
    <div className="echoid-search-page">
      <section className="echoid-searchbox">
        <Search size={16} />
        <input
          aria-label="Search EchoId"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search posts, tags, people"
        />
      </section>

      <section className="echoid-section">
        <div className="echoid-section-heading">
          <span className="echoid-section-label">Trending fields</span>
        </div>
        <div className="echoid-chip-row">
          {trendSeed.map((trend) => (
            <button
              key={trend.id}
              type="button"
              className={`echoid-chip ${selectedTrend === trend.label ? "is-active" : ""}`}
              onClick={() => setSelectedTrend(trend.label)}
            >
              {trend.label}
              <span>{trend.posts}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="echoid-section">
        <div className="echoid-section-heading">
          <span className="echoid-section-label">Search results</span>
        </div>
        {filteredPosts.length > 0 ? (
          filteredPosts.map(renderPostCard)
        ) : (
          <div className="echoid-empty-card">No matching echoes yet.</div>
        )}
      </section>
    </div>
  );

  const renderAlerts = () => (
    <div className="echoid-stack">
      <section className="echoid-hero-card is-compact">
        <div>
          <div className="echoid-section-label">Alerts</div>
          <h2>Watchpoints, replies, and local movement.</h2>
        </div>
      </section>

      {alertSeed.map((alert) => (
        <article key={alert.id} className={`echoid-alert-card tone-${alert.tone}`}>
          <div className="echoid-alert-icon">
            {alert.tone === "warning" ? <TriangleAlert size={18} /> : <Sparkles size={18} />}
          </div>
          <div className="echoid-alert-copy">
            <strong>{alert.title}</strong>
            <p>{alert.copy}</p>
            <span>{formatRelativeTime(alert.minutesAgo)}</span>
          </div>
        </article>
      ))}
    </div>
  );

  const renderProfile = () => (
    <div className="echoid-stack">
      <section className="echoid-profile-card">
        <div className="echoid-profile-avatar">E</div>
        <div className="echoid-profile-copy">
          <h2>Echo Operative</h2>
          <span>@echoid.core</span>
          <p>Collecting strange city signals, low-light stories, and coded weather reports.</p>
        </div>
      </section>

      <section className="echoid-grid-stats">
        {profileStats.map((item) => (
          <div key={item.label} className="echoid-grid-stat">
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </section>

      <section className="echoid-section">
        <div className="echoid-section-heading">
          <span className="echoid-section-label">Saved identity</span>
        </div>
        <div className="echoid-detail-list">
          <div className="echoid-detail-row">
            <span>Region</span>
            <strong>Sector Nine</strong>
          </div>
          <div className="echoid-detail-row">
            <span>Signal mode</span>
            <strong>Public relay</strong>
          </div>
          <div className="echoid-detail-row">
            <span>Joined</span>
            <strong>May 2025</strong>
          </div>
        </div>
      </section>
    </div>
  );

  const renderComposer = () => (
    <div className="echoid-stack">
      <section className="echoid-hero-card is-compact">
        <div>
          <div className="echoid-section-label">Create echo</div>
          <h2>Broadcast a new post to your field.</h2>
        </div>
      </section>

      <section className="echoid-compose-card">
        <label className="echoid-compose-label" htmlFor="echoid-compose">
          What are you seeing?
        </label>
        <textarea
          id="echoid-compose"
          value={composeText}
          onChange={(event) => setComposeText(event.target.value)}
          placeholder="Write the next anomaly, update, or coded observation..."
          maxLength={280}
        />
        <div className="echoid-compose-footer">
          <button type="button" className="echoid-attach-btn">
            <ImageIcon size={16} />
            Add image
          </button>
          <span>{composeText.length}/280</span>
        </div>
        <button type="button" className="echoid-primary-btn">
          Publish Echo
        </button>
      </section>
    </div>
  );

  const renderActivePage = () => {
    switch (activeTab) {
      case "search":
        return renderSearch();
      case "alerts":
        return renderAlerts();
      case "profile":
        return renderProfile();
      case "echo":
        return renderComposer();
      case "home":
      default:
        return renderHome();
    }
  };

  return (
    <div className="echoid-page">
      {isDrawerOpen ? (
        <button
          type="button"
          className="echoid-drawer-overlay"
          aria-label="Close navigation drawer"
          onClick={() => setIsDrawerOpen(false)}
        />
      ) : null}

      <aside className={`echoid-drawer ${isDrawerOpen ? "is-open" : ""}`} aria-label="EchoId categories">
        <div className="echoid-drawer-head">
          <span className="echoid-drawer-kicker">Menu</span>
          <strong>EchoId</strong>
        </div>

        {drawerSections.map((section) => (
          <section key={section.title} className="echoid-drawer-section">
            <div className="echoid-drawer-section-title">{section.title}</div>
            <div className="echoid-drawer-list">
              {section.items.map((item) => (
                <button key={item} type="button" className="echoid-drawer-item">
                  <span>{item}</span>
                  <ChevronRight size={15} />
                </button>
              ))}
            </div>
          </section>
        ))}
      </aside>

      <div className="echoid-shell">
        <header className="echoid-header">
          <div className="echoid-header-left">
            <button
              type="button"
              className="echoid-icon-button"
              aria-label="Open menu"
              onClick={() => setIsDrawerOpen((current) => !current)}
            >
            <Menu size={18} />
            </button>

            <div className="echoid-brand">
              <span className="echoid-brand-mark">
                <Compass size={13} />
              </span>
              <strong>EchoId</strong>
            </div>
          </div>

          <button type="button" className="echoid-icon-button" aria-label="Open filters">
            <Filter size={18} />
          </button>
        </header>

        <main className="echoid-content">{renderActivePage()}</main>

        <nav className="echoid-bottomnav" aria-label="EchoId navigation">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                className={`echoid-nav-button ${tab.isPrimary ? "is-primary" : ""} ${isActive ? "is-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="echoid-nav-button-icon">
                  <Icon size={tab.isPrimary ? 16 : 17} />
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
