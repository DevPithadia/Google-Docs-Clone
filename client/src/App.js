import TextEditor from "./TextEditor";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom'
import { v4 as uuidV4 } from 'uuid'
import Dashboard from "./Dashboard";

function App() {
  return (
    <Router>
      <Routes>
        {/* <Route path="/" exact element={<Navigate to={`/documents/${uuidV4()}`} />} /> */}
        <Route path="/" element={<Dashboard/>} />
        <Route path="/documents/:id" element={<TextEditor />} />
      </Routes>
    </Router>
  );
}

export default App;
