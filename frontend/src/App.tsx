import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/auth/Login";
import NotFound from "./pages/NotFound";
import { GoogleOAuthProvider } from "@react-oauth/google";


const cliendId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function App() {
  return (
    <BrowserRouter>
      <GoogleOAuthProvider clientId={cliendId}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </GoogleOAuthProvider>
    </BrowserRouter>
  );
}


export default App;
