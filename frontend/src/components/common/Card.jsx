const Card = ({ title, subtitle, icon: Icon, action, children, className = '' }) => {
  return (
    <section className={`kv-card ${className}`.trim()}>
      {(title || action) && (
        <div className="kv-card-header">
          <div>
            {title && (
              <h2 className="kv-card-title">
                {Icon && <Icon size={18} color="var(--kv-primary)" />}
                <span>{title}</span>
              </h2>
            )}
            {subtitle && <p className="kv-card-subtitle">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
};

export default Card;
