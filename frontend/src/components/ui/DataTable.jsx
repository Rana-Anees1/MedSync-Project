import EmptyState from './EmptyState';

/** Generic table. columns: [{ key, label, render?(row), className? }] */
export default function DataTable({ columns, rows, onRowClick, empty = 'No records found', rowKey = (r) => r.id }) {
  if (!rows.length) return <EmptyState title={empty} />;
  return (
    <div className="table-wrap">
      <table className={`table ${onRowClick ? 'table--hover' : ''}`}>
        <thead><tr>{columns.map((c) => <th key={c.key} className={c.className}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)} onClick={onRowClick ? () => onRowClick(r) : undefined}>
              {columns.map((c) => <td key={c.key} className={c.className}>{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
