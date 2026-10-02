import {
    Bar,
    BarChart,
    CartesianGrid,
    LabelList,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
export default function NipcCharts({ charts }){
    if (!charts) {
        return null;
    }
    const titles = {
        monthly: "Variations mensuelles",
        annual: "Clissements annuels",
        quartely: "Variations trimestrielles"
    };

    function formatPercent(value){
        return `${value.toLocaleString("fr-FR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}%`;
    }
    return (
        <section className="charts-section">
            {Object.entries(charts).map(([chartType, chart]) => (
                <article className="chart-card" key={chartType}>
                    <h2>
                        {titles[chartType]} ({chart.from} a {chart.to})
                    </h2>

                    <ResponsiveContainer width="100%" height={380}>
                        <BarChart
                            data={chart.data}
                            layout="vertical"
                            margin={{top: 10, right: 65, left: 20, bottom: 10}}
                        >
                            <CartesianGrid strokeDasharray="3 3"/>
                            <XAxis
                                type="number"
                                tickFormatter={formatPercent}
                            />
                            <YAxis 
                                type="category"
                                dataKey="name"
                                width={125}
                            />
                            <Tooltip
                                formatter={(value) => formatPercent(value)}
                            />
                            <Bar
                                dataKey="value"
                                fill="#14769e"
                                radius={[0, 3, 3, 0]}
                            >
                                <LabelList
                                    dataKey="value"
                                    position="right"
                                    formatter={formatPercent}
                                />
                            </Bar>   
                        </BarChart>
                    </ResponsiveContainer>
                </article>
            ))}
        </section>
    );
}