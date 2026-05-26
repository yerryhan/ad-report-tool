import { BrowserRouter as Router, Routes, Route } from "react-router";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import DataUpload from "./pages/DataManagement/DataUpload";
import DataHistory from "./pages/DataManagement/DataHistory";
import HospitalBooking from "./pages/Marketing/HospitalBooking";
import { ColorThemeProvider } from "./context/ColorThemeContext";
import { GadaDataProvider } from "./context/GadaDataContext";

export default function App() {
  return (
    <ColorThemeProvider>
      <GadaDataProvider>
        <Router>
          <ScrollToTop />
          <Routes>
            <Route element={<AppLayout />}>
              <Route index path="/" element={<Home />} />
              <Route path="/data/upload" element={<DataUpload />} />
              <Route path="/data/history" element={<DataHistory />} />
              <Route path="/marketing/hospital" element={<HospitalBooking />} />
            </Route>
          </Routes>
        </Router>
      </GadaDataProvider>
    </ColorThemeProvider>
  );
}
