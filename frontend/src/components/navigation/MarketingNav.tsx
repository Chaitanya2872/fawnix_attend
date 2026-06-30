import { useNavigate } from 'react-router-dom'
import fawnixBg from '../../assets/fawnix_bg.png'
import { appRoutes } from '../../app/config/routes'

type MarketingNavProps = {
  onRequestDemo?: () => void
}

export function MarketingNav({ onRequestDemo }: MarketingNavProps) {
  const navigate = useNavigate()

  const handleRequestDemo = () => {
    if (onRequestDemo) {
      onRequestDemo()
      return
    }

    navigate(appRoutes.admin)
  }

  return (
    <nav className="nav">
      <div className="brand">
        <img className="brand-mark brand-mark-logo" src={fawnixBg} alt="Fawnix logo" />
        <div>
          <div className="brand-name">Fawnix</div>
          <div className="brand-tag">Workforce Operations Suite</div>
        </div>
      </div>
      <div className="nav-links">
        <a href="#use-cases">Use cases</a>
        <a href="#features">Features</a>
        <a href="#workflow">Workflow</a>
        <a href="#delete">Delete account</a>
      </div>
      <button className="cta" onClick={handleRequestDemo} type="button">
        Request Demo
      </button>
    </nav>
  )
}
