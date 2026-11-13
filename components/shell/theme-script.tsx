// The saved choice lives under "theme-v2": an older "theme" value (saved when dark followed the system) is ignored, so
// everyone starts in light mode once. Runs before paint so the saved theme is applied without a flash. Light is the default: the system's dark setting is
// deliberately ignored, and dark is used only when the person chose it with the toggle.
const script = `(function(){try{var t=localStorage.getItem("theme-v2");var d=t==="dark";document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
