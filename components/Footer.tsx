export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-main">
        <a href="#top" className="wordmark">INFLUENCE ROCK</a>
        <nav aria-label="Footer navigation">
          <a href="#capabilities">What we do</a>
          <a href="#network">Where we work</a>
          <a href="#method">Our method</a>
          <a href="#responsibility">About</a>
          <a href="#consultation">Contact</a>
        </nav>
        <p>People. Places. Progress.</p>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Influence Rock. All rights reserved.</span>
        <span>Global strategic relations · Government affairs · Market entry</span>
      </div>
    </footer>
  );
}
