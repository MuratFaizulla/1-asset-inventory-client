// components/import/ui/Spinner.tsx

export default function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span style={{
      width:        size,
      height:       size,
      border:       '2px solid #ffffff44',
      borderTop:    '2px solid #fff',
      borderRadius: '50%',
      display:      'inline-block',
      animation:    'spin 0.8s linear infinite',
    }} />
  )
}