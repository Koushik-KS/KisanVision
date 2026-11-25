import { FiLoader } from 'react-icons/fi';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon: Icon,
  type = 'button',
  disabled = false,
  onClick,
  className = '',
  ...rest
}) => {
  const classes = [
    'kv-btn',
    `kv-btn-${variant}`,
    size === 'sm' ? 'kv-btn-sm' : '',
    fullWidth ? 'kv-btn-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      {...rest}
    >
      {loading ? (
        <FiLoader size={16} className="kv-spin" />
      ) : (
        Icon && <Icon size={16} />
      )}
      <span>{children}</span>
    </button>
  );
};

export default Button;
