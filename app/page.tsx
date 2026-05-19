import Link from "next/link";

export default function HomePage() {
  return (
    <main className="home-page">
      <div className="logo-sticker">VARDO</div>
      <section className="hero-section">
        <h1>Make music. Not mess.</h1>

        <p>Plan, share and track progress with your band — or by yourself.</p>

        <div className="hero-actions">
          <Link href="/pages/auth/login" className="btn btn-dark">
            Log in
          </Link>

          <Link href="/pages/auth/register" className="btn btn-accent">
            Create account
          </Link>
        </div>
      </section>

      <section className="preview-section">
        <div className="section-label">Your project, your control</div>

        <div className="app-preview">
          <div className="mini-navbar">
            <span>Logo</span>
            <nav>
              <a>Dashboard</a>
              <a>Songs</a>
              <a>Band</a>
            </nav>
          </div>

          <div className="preview-content">
            <aside></aside>
            <div></div>
            <div></div>
          </div>
        </div>
      </section>

      <section className="bands-section">
        <h2>Bands on the stage</h2>

        <div className="band-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="band-card" key={index}>
              <div className="band-avatar"></div>
              <h3>Lorem Ipsum</h3>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
