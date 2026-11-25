const Tabs = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="kv-tabs" role="tablist">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`kv-tab-btn ${isActive ? 'active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {Icon && <Icon size={15} />}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
