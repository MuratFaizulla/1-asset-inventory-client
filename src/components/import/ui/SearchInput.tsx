// components/import/ui/SearchInput.tsx

interface Props {
  value:       string
  onChange:    (v: string) => void
  placeholder: string
}

export default function SearchInput({ value, onChange, placeholder }: Props) {
  return (
    <div style={{ position: 'relative', marginBottom: 12 }}>
      <span style={{
        position:  'absolute',
        left:      10,
        top:       '50%',
        transform: 'translateY(-50%)',
        color:     'var(--text3)',
        fontSize:  14,
      }}>
        🔍
      </span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width:       '100%',
          padding:     '8px 10px 8px 32px',
          background:  'var(--bg3)',
          border:      '1px solid var(--border)',
          borderRadius: 8,
          color:       'var(--text1)',
          fontSize:    13,
          boxSizing:   'border-box',
          outline:     'none',
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            position:   'absolute',
            right:      8,
            top:        '50%',
            transform:  'translateY(-50%)',
            background: 'none',
            border:     'none',
            cursor:     'pointer',
            color:      'var(--text3)',
            fontSize:   16,
            lineHeight: 1,
            padding:    0,
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}