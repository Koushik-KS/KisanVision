const StatCard = ({ label, value, icon: Icon, tone = 'green' }) => {
  return (
    <div className="kv-stat-card">
      <div className={`kv-stat-icon ${tone}`}>
        {Icon && <Icon size={20} />}
      </div>
      <div>
        <div className="kv-stat-label">{label}</div>
        <div className="kv-stat-value">{value}</div>
      </div>
    </div>
  );
};

export default StatCard;
