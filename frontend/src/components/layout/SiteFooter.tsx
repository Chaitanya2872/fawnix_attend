import { Link } from 'react-router-dom'
import { appRoutes } from '../../app/config/routes'

export function SiteFooter() {
  return (
    <footer className="footer">
      <div>
        <strong>Fawnix</strong>
        <p>Modern workforce operations for distributed teams.</p>
      </div>
      <div className="footer-links">
        <Link to={appRoutes.privacy}>Privacy</Link>
        <Link to={`${appRoutes.home}#delete`}>Delete account</Link>
        <Link to={appRoutes.home}>Home</Link>
      </div>
    </footer>
  )
}
