import React from 'react';

function KpiCard({ title, value, description, color, icon, secondaryValue }) {
    return (
        <div className={`kpi-card ${color}`}>
            <h3>{title}</h3>
            <div className="d-flex justify-content-between align-items-center">
                <span className="value">{value}</span>
                {/* Ícone pode ser adicionado aqui no futuro */}
            </div>
            <p className="description">{description}</p>
            {secondaryValue && <small className="secondary-value">{secondaryValue}</small>}
        </div>
    );
}

export default KpiCard;