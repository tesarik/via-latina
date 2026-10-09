interface Props {
  onUpdate: () => void;
  onDismiss: () => void;
}

/** Bottom prompt shown when a newer build is installed and waiting. */
export default function UpdateToast({ onUpdate, onDismiss }: Props) {
  return (
    <div className="update-toast" role="status">
      <span>Je k dispozici nová verze.</span>
      <button type="button" className="update-btn" onClick={onUpdate}>
        Aktualizovat
      </button>
      <button type="button" className="update-x" aria-label="Zavřít" onClick={onDismiss}>
        ×
      </button>
    </div>
  );
}
