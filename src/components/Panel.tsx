import type { PropsWithChildren, ReactNode } from 'react'

export function Panel(props: PropsWithChildren<{ title: ReactNode; right?: ReactNode; className?: string }>) {
  return (
    <section className={`panel ${props.className ?? ''}`.trim()}>
      <div className="panelHeader">
        <div className="panelTitle">{props.title}</div>
        {props.right ? <div>{props.right}</div> : null}
      </div>
      <div className="panelBody">{props.children}</div>
    </section>
  )
}

