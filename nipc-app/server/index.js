import express from "express";
import cors from "cors";
import multer from "multer";
import XLSX from "xlsx";

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json());

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 *1024 }
});

let nipcData = null; 

function formatPeriod(value){
    if (value instanceof Date){
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, "0");
        return `${year}-${month}`;
    }
    const text = String(value || "");
    const result = text.match(/(\d{4})[-/](\d{1,2})/);

    if (result) {
        return `${result[1]}-${result[2].padStart(2, "0")}`;
    }    
    return null;
}
app.post ("/api/import-excel", upload.single("file"),(request, response) => {
    try {
    if (!request.file) {
        return response.status(400).json({
            message:"Veuillez selectionner un fichier excel."
        });
    }
    const workbook = XLSX.read(request.file.buffer,{
        type: "buffer",
        cellDates: true
    });
    const sheetName = workbook.SheetNames.find((name)=> {
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name],{
            header: 1
        });
        return rows.some((row) =>
        String (row[0] || "").toUpperCase().includes("LIBELLE")
        );
    });
    if (!sheetName) {
        return response.status(400).json({
            message: "La feuille avec la colonne LIBELLE - PERIODE est introuvable"
        });
    } 
    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: true,
        defval: null
    });

    const headerIndex = rows.findIndex((row) => 
        String(row[0] || "").toUpperCase().includes("LIBELLE")
    );

    const header = rows[headerIndex];

    const periods = header
        .slice(2)
        .map(formatPeriod)
        .filter(Boolean);
    let category = "Ensemble";
    const series =[];

    for (const row of rows.slice(headerIndex + 1)){
        const label = String(row[0] || "").trim();

        if (!label) continue;

        const numericValues = row.slice(1).filter(
            (value) => typeof value === "number"
        );
        if (numericValues.length === 0){
            category = label;
            continue;
        }
        const values = periods.map((period, index) => ({
            period,
            value: typeof row[index + 2] === "number"
                ? row[index + 2]
                : null
        }));
        series.push({
            label,
            category,
            weight: typeof row[1] === "number" ? row[1] : null,
            values
        });
    }
    nipcData = {
        sourceFile: request.file.originalname,
        sheetName,
        importedAt: new Date().toISOString(),
        periods,
        series
    };
    return response.json({
        nipcData,
        message: "Fichier importe avec succes"
    });
}catch (error){
    
    return response.status(500).json({
        message: "Erreur pendant l'importation",
        error: error.message
    });
    }
});

app.get("/api/categories", (request, response) => {
    if(!nipcData){
        return response.status(404).json({
            message: "Aucun fichier Excel n'a ete importe."
        });
    }
    const categories = {};

    for (const item of nipcData.series){
        if (!categories[item.category]){
            categories[item.category] = [];
        }
        categories[item.category].push({
            label : item.label,
            weight: item.weight
        });
    }
    response.json({
        periods: nipcData.periods,
        categories
    });
});

app.get("/api/nipc", (request, response) => {
    if(!nipcData){
        return response.status(404).json({
            message:"Importez d'abord un fichier Excel"
        });
    }
    const labels = String(request.query.labels || "")
        .split(",")
        .filter(Boolean);

    const from = request.query.from || nipcData.periods[0];
    const to = request.query.to || nipcData.periods.at(-1);

    const selectedPeriods = nipcData.periods.filter(
        (period) => period >= from && period <= to
    );
    const selectedRows = nipcData.series 
        .filter ((item) => labels.length === 0 || labels. includes (item.label))
        .map ((item) => ({
            label: item.label,
            category: item.category,
            weight: item.weight,
            values: item.values.filter(
                (itemvalue) => 
                    itemvalue.period >= from &&itemvalue.period <= to
            )
        }));
    response.json({
        periods: selectedPeriods,
        rows: selectedRows
    });    
});
function calculateVariation(currentValue, previousValue){
    if (currentValue === null || previousValue === null || previousValue === 0){
        return nullll;
    }
    return((currentValue - previousValue)/previousValue)*100;
}
function createChartData(monthDifference){
    const lastIndex = nipcData.periods.length - 1;
    const previousIndex = lastIndex - monthDifference;
    const selectedSeries = nipcData.series.filter((item) => {
        return item.label === "Ensemble" || item.category === "GEOGRAPHIE";
    });

    const data = selectedSeries 
        .map ((item) => {
            const currentValue = item.values[lastIndex]?.value;
            const previousValue = item.values[previousIndex]?.value;
            const value = calculateVariation(currentValue, previousValue);
            return {
                name: item.label,
                value: value === null? null : Number(value.toFixed(2))
            };
        })
        .filter ((item) => item.value !== null);
        return {
            from: nipcData.periods[previousIndex],
            to: nipcData.periods[lastIndex],
            data
        };
}

app.get ("/api/graphs", (request, response) => {
    if (!nipcData) {
        return response.status(404).json({
            message: "Importez d'abord un fichier excel"
        });
    }
    if (nipcData.periods.length < 13){
        return response.status(400).json({
            message: "Il faut au moins treize mois de donnees pour le glissement annuel"
        });
    }
    response.json({
        monthly: createChartData(1),
        annual: createChartData(12),
        quarterly: createChartData(3)
    });
});
app.listen(port, () => {
    console.log(`Serveur demarre : http:// localhost:${port}`);
});


