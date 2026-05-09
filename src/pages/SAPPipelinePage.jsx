import { Navigate } from 'react-router-dom'

// The prospect board now lives under /partners?view=prospect as one
// segment of the unified SAPs page. This redirect keeps prior
// bookmarks and in-app links working.
export default function SAPPipelinePage() {
  return <Navigate to="/partners?view=prospect" replace />
}
