import React from 'react';

type CardProps = React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>;

export function Card({ className, children, ...rest }: CardProps) {
  return (
    <div {...rest} className={['mg-card', 'mg-card--soft', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}
