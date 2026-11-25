import { FiInbox } from 'react-icons/fi';

const EmptyState = ({
  icon: Icon = FiInbox,
  title,
  description,
  action,
}) => {
  return (
    <div className="kv-empty-state">
      <div className="kv-empty-icon">
        <Icon size={22} />
      </div>
      <h3 className="kv-empty-title">{title}</h3>
      {description && <p className="kv-empty-desc">{description}</p>}
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  );
};

export default EmptyState;
