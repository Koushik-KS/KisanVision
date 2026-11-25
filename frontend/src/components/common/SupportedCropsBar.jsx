import { FiCheckCircle } from 'react-icons/fi';
import { SUPPORTED_CROPS } from '../../utils/constants';

const SupportedCropsBar = ({ label = 'Supported Crops' }) => {
  return (
    <div className="kv-crops-bar">
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--kv-text-secondary)' }}>
        {label}:
      </span>
      {SUPPORTED_CROPS.map((crop) => (
        <span key={crop} className="kv-crop-chip">
          <FiCheckCircle size={12} />
          <span>{crop}</span>
        </span>
      ))}
    </div>
  );
};

export default SupportedCropsBar;
