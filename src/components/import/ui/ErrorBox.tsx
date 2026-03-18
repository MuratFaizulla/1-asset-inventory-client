// components/import/ui/ErrorBox.tsx

export default function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{
      marginBottom: 12,
      padding:      '10px 14px',
      background:   '#450a0a22',
      border:       '1px solid var(--danger)',
      borderRadius: 8,
      color:        '#fca5a5',
      fontSize:     13,
      display:      'flex',
      alignItems:   'center',
      gap:          8,
    }}>
      ❌ {msg}
    </div>
  )
}