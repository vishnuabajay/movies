
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home/Home'
import { MovieDetails } from './pages/MovieDetails/MovieDetails'

function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movie/:id" element={<MovieDetails />} />
      </Routes>
    </Router>
  )
}

export default App
