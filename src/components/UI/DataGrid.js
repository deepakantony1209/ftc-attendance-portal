import React from 'react';
import Card from './Card';

const DataGrid = ({ columns = [], data = [], actions = [], emptyMessage = 'No data found.' }) => {
    if (data.length === 0) {
        return (
            <Card>
                <div className="text-center py-16 text-slate-400 dark:text-slate-500">
                    <i className="bi bi-inbox text-5xl block mb-3 opacity-50"></i>
                    <p className="text-lg font-medium">{emptyMessage}</p>
                </div>
            </Card>
        );
    }

    return (
        <>
            {/* Desktop Table */}
            <div className="hidden md:block">
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    {columns.map((col, i) => (
                                        <th key={i}>{col.header}</th>
                                    ))}
                                    {actions.length > 0 && <th className="text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                        {columns.map((col, colIndex) => (
                                            <td key={colIndex}>
                                                {col.render ? col.render(row) : row[col.field]}
                                            </td>
                                        ))}
                                        {actions.length > 0 && (
                                            <td className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {actions.map((action, actionIndex) => (
                                                        <button
                                                            key={actionIndex}
                                                            onClick={() => action.onClick(row)}
                                                            className={`p-2 rounded-lg transition-colors text-sm ${action.variant === 'danger'
                                                                    ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                                                                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                                }`}
                                                            title={action.label}
                                                        >
                                                            <i className={`bi ${action.icon}`}></i>
                                                        </button>
                                                    ))}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
                {data.map((row, rowIndex) => (
                    <Card key={rowIndex} className="animate-fade-in">
                        <Card.Body>
                            {columns.map((col, colIndex) => (
                                <div key={colIndex} className="flex justify-between items-start py-1.5">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{col.header}</span>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 text-right">
                                        {col.render ? col.render(row) : row[col.field]}
                                    </span>
                                </div>
                            ))}
                            {actions.length > 0 && (
                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                                    {actions.map((action, actionIndex) => (
                                        <button
                                            key={actionIndex}
                                            onClick={() => action.onClick(row)}
                                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${action.variant === 'danger'
                                                    ? 'text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/30'
                                                    : 'text-primary-600 bg-primary-50 hover:bg-primary-100 dark:text-primary-400 dark:bg-primary-900/20 dark:hover:bg-primary-900/30'
                                                }`}
                                        >
                                            <i className={`bi ${action.icon}`}></i>
                                            {action.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                ))}
            </div>
        </>
    );
};

export default DataGrid;
