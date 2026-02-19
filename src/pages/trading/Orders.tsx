import React from 'react'

const Orders: React.FC<{title?:string}> = ({title='Orders'}) => {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2">{title}</h2>
      <p className="text-sm text-slate-400">This is a placeholder page. Add content here.</p>
    </div>
  )
}

export default Orders
