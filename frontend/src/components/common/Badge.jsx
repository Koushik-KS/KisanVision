const Badge = ({ children, variant = 'neutral', icon: Icon }) => {
  return (
    <span className={`kv-badge kv-badge-${variant}`}>
      {Icon && <Icon size={13} />}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
