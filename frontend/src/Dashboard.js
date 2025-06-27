
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker, { registerLocale } from 'react-datepicker';
import ptBR from 'date-fns/locale/pt-BR';
import "react-datepicker/dist/react-datepicker.css";
import KpiCard from './KpiCard';
import { format } from 'date-fns';

registerLocale('pt-BR', ptBR);

function Dashboard({ startDate, setStartDate, endDate, setEndDate, selectedState, setSelectedState }) {
    const [kpis, setKpis] = useState({});
    const [selectedChannel, setSelectedChannel] = useState('Todos');
    const [channels, setChannels] = useState([]);

    useEffect(() => {
        axios.get('http://127.0.0.1:8000/api/channels')
            .then(response => {
                setChannels(['Todos', ...response.data]);
            })
            .catch(error => {
                console.error("Erro ao buscar canais:", error);
            });
    }, []);

    useEffect(() => {
        fetchKpis();
    }, [startDate, endDate, selectedState, selectedChannel]);

    const fetchKpis = () => {
        const start = format(startDate, 'yyyy-MM-dd');
        const end = format(endDate, 'yyyy-MM-dd');

        let url = `http://127.0.0.1:8000/api/kpis?start_date=${start}&end_date=${end}`;
        if (selectedState !== 'Todos') {
            url += `&state_filter=${selectedState}`;
        }
        if (selectedChannel !== 'Todos') {
            url += `&channel_filter=${selectedChannel}`;
        }

        axios.get(url)
            .then(response => {
                setKpis(response.data);
            })
            .catch(error => {
                console.error("Erro ao buscar KPIs:", error);
            });
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Dashboard</h2>
                <div className="d-flex align-items-center">
                    <div className="date-filter-container me-3">
                        <DatePicker 
                            selected={startDate} 
                            onChange={(date) => setStartDate(date)} 
                            selectsStart 
                            startDate={startDate} 
                            endDate={endDate} 
                            className="form-control" 
                            locale="pt-BR"
                            dateFormat="dd/MM/yyyy"
                        />
                        <DatePicker 
                            selected={endDate} 
                            onChange={(date) => setEndDate(date)} 
                            selectsEnd 
                            startDate={startDate} 
                            endDate={endDate} 
                            minDate={startDate} 
                            className="form-control" 
                            locale="pt-BR"
                            dateFormat="dd/MM/yyyy"
                        />
                    </div>
                    <div className="form-group me-3">
                        <select 
                            className="form-select" 
                            value={selectedState} 
                            onChange={(e) => setSelectedState(e.target.value)}
                        >
                            <option value="Todos">Todos os Estados</option>
                            <option value="Paraná">Paraná</option>
                            <option value="Santa Catarina">Santa Catarina</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <select 
                            className="form-select" 
                            value={selectedChannel} 
                            onChange={(e) => setSelectedChannel(e.target.value)}
                        >
                            {channels.map(channel => (
                                <option key={channel} value={channel}>{channel}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="row">
                <div className="col-md-4"><KpiCard title="Unidades Ativas" value={kpis.unidadesAtivas} description="Anúncios ativos no sistema" color="bg-blue" /></div>
                <div className="col-md-4"><KpiCard title="Check-ins" value={kpis.checkIns} description="Check-ins no período" color="bg-green" /></div>
                <div className="col-md-4"><KpiCard title="Check-outs" value={kpis.checkOuts} description="Check-outs no período" color="bg-red" /></div>
                <div className="col-md-4"><KpiCard title="Total Faturado" value={formatCurrency(kpis.totalFaturado)} description="Receita total do período" color="bg-purple" /></div>
                <div className="col-md-4"><KpiCard title="Total de Reservas" value={kpis.totalReservas} description="Estadias no período" color="bg-blue" /></div>
                <div className="col-md-4"><KpiCard title="Ticket Médio" value={formatCurrency(kpis.ticketMedio)} description="Valor médio por reserva" color="bg-orange" /></div>
                <div className="col-md-4"><KpiCard title="Taxa de Ocupação" value={`${(kpis.taxaOcupacao || 0).toFixed(2)}%`} description="(Noites / (Dias * Unidades))" color="bg-teal" /></div>
                <div className="col-md-4"><KpiCard title="Comissão da Empresa" value={formatCurrency(kpis.comissaoEmpresa)} description="Somatório da comissão da empresa" color="bg-purple" /></div>
                <div className="col-md-4"><KpiCard title="Total Taxa de Limpeza" value={formatCurrency(kpis.totalTaxaLimpeza)} description="Somatório da taxa de limpeza" color="bg-green" secondaryValue={`Comissão Gonzaga: ${formatCurrency(kpis.comissaoGonzagaCalculada)}`} /></div>
            </div>
        </div>
    );
}

export default Dashboard;
