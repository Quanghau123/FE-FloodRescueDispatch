export default function JsonView(props: { value: unknown }) {
  const text = JSON.stringify(props.value, null, 2)
  return (
    <pre
      className="panel"
      style={{
        padding: 12,
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontSize: 12
      }}
    >
      <code className="mono">{text}</code>
    </pre>
  )
}

