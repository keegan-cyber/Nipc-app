import { useEffect, useState } from "react";
import "./App.css";
import NipcCharts from "./NipcCharts.jsx";

const API_URL = "http://localhost:4000";

export default function App() {
  const [categories, setCategories]= useState({});
  const [periods, setPeriods] = useState([]);
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tableData, setTableData] = useState(null);
  const [charts, setCharts] = useState(null);
  const [file,setFile] = useState(null);
  const [message, setMessage] = useState("Importez un fichier Excel pour commencer.");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCategories();
  },[]);
  async function loadCharts(){
    try {
      const response = await fetch(`${API_URL}/api/graphs`);
      if (!response.ok){
        return;
      }
      const data = await response.json();
      setCharts(data);
    }catch{
      setCharts(null);
    }
  }
  async function loadCategories(){
    try{
      const response = await fetch(`${API_URL}/api/categories`);
      if (!response.ok){
        return;
      }
      const data = await response.json();

      setCategories(data.categories);
      setPeriods(data.periods);
      setFrom(data.periods[0]);
      setTo(data.periods[data.periods.length - 1]);

      if (data.categories.Ensemble){
        setSelectedLabels(["Ensemble"]);
      }
      setMessage("Fichier Excel charge avec succes");
      await loadCharts();
    } catch {
      setMessage("Le serveur Express doit etre demarrer sur le port 4000");
    }
  }
  function toggleLabel(label){
    if (selectedLabels.includes(label)){
      setSelectedLabels(
        selectedLabels.filter((selectedLabel) => selectedLabel !== label)
      );
    } else{
      setSelectedLabels([...selectedLabels, label]);
    }
  }
  async function importExcel(event) {
    event.preventDefault();

    if (!file){
      setMessage("Veuillez selectionner un fichier Excel");
      return;
    }
    try{
      setLoading(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_URL}/api/import-excel`,{
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok){
        setMessage(data.message);
        return;
      }
      setMessage(data.message);
    

    setMessage(
      `${data.message} ${data.totalSeries} series et ${data.totalPeriods}mois trouves`
    );

    await loadCategories();
  } catch {
    setMessage("Erreur pendant l'importation du fichier");
  } finally {
    setLoading(false);
  }
}
async function updateTable() {
  try {
    setLoading(true);
    const parameters = new URLSearchParams({
      labels: selectedLabels.join(","),
      from,
      to
    });
    const response = await fetch(
      `${API_URL}/api/nipc?${parameters.toString()}`
    );
    const data = await response.json();

    if (!response.ok){
      setMessage(data.message);
      return;
    }
    setTableData(data);
    setMessage(`${data.rows.length} ligne afficher`);
  }catch {
    setMessage("impossible de recuperer les donnes");
  }finally{
    setLoading(false);
  }
}
return (
  <main>
    <header>
      <div className="container">
        <p className = "institution"> INSTAT Madagascar</p>
        <h1>Indice des prix a la consommation</h1>
        <h2> depuis janvier 2016</h2>
        <p className="subtitle">(Base 100 : moyenne de l'annee 2016)</p>
      </div>
    </header>
    <section className="container">
      <p className="message">{message}</p>
      <details className="admin">
        <summary>Administration : importer un fichier Excel</summary>
        <form onSubmit={importExcel}>
          <input 
            type="file"
            accept=".xlsx,.xls"
            onChange={(event) => setFile(event.target.files[0])}
          />
          <button type="submit" disabled={loading}>
            {loading ? "importation...": "importer le fichier"}  
          </button>  
        </form>
      </details>
      <NipcCharts charts={charts}/>
      <section className="filters">
        <h3>Consultation NIPC par produits</h3>
        <div className="periods">
          <label>
            De:
            <select value={from} onChange={(event) => setFrom(event.target.value)}>
              {periods.map((period)=> (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
          </label>
          <label>
            A :
            <select value={to} onChange={(event)=> setTo(event.target.value)}>
              {periods.map((period)=>(
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
          </label>
        </div>

        <h3>Veuillez cocher les libelles a consulter</h3>
        
        <div className="categories">
          {Object.entries(categories).map(([categoryname, labels]) => (
            <fieldset key={categoryname}>
              <legend>{categoryname}</legend>

              {labels.map((item) => (
                <label className="checkbox-label" key={item.label}>
                  <input 
                    type="checkbox"
                    checked={selectedLabels.includes(item.label)}
                    onChange={()=> toggleLabel(item.label)}
                  />
                  {item.label}  
                </label>
              ))}
            </fieldset>
          ))}
        </div>

        <button className="update-button" onClick={updateTable} disabled={loading}>
          {loading? "Chargement...": "Actualiser le tableau"}
        </button>
      </section>
      {tableData &&(
        <section className="table-section">
          <h3>Resultats NIPC</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Libelle</th>
                  <th>Ponderation</th>

                  {tableData.periods.map((period)=> (
                    <th key = {period}>{period}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row)=>(
                  <tr key={`${row.category}-${row.label}`}>
                    <td>{row.label}</td>
                    <td>
                      {row.weight
                      ? row.weight.toLocaleString("fr-FR", {
                        maximumFractionDigits: 2
                      })
                      :"-"}
                    </td>
                    {row.values.map((item) => (
                      <td key={item.period}>
                        {item.value
                        ? item.value.toLocaleString("fr-FR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })
                      :"-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </section>
  </main>
)};