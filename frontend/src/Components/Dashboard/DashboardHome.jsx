"use client"

import Image from 'next/image'

export default function DashboardHome() {
  return (
    <div className="dash-home">
      <div className="dash-toolbar">
        <h2>Analytics</h2>
        <div className="toolbar-right">
          <button className="date-pill">01.08.2022 - 01.04.2024</button>
          <div className="modes">
            <button className="mode">☀</button>
            <button className="mode">◐</button>
          </div>
          <div className="avatar">
            <Image src="/next.svg" alt="user" width={28} height={28} />
          </div>
        </div>
      </div>

      <section className="grid stats">
        <Card title="Users" value="201" sub="" />
        <Card title="Spins" value="36" />
        <BigCard title="Users" value="4.890" donutColor="#4a9eff" />
        <BigCard title="premium" value="1.201" donutColor="#2740ff" />
        <Card title="Month Total spin" value="25410" currency />
        <Card title="Revenue" value="1352" />
      </section>

      <section className="grid charts">
        <Panel title="Sales Dynamics">
          <div className="bars">
            {new Array(12).fill(0).map((_, i) => (
              <div className="bar" key={i} style={{height: `${30 + ((i*37)%70)}%`}}></div>
            ))}
          </div>
          <div className="months">
            {['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'].map(m => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </Panel>

        <Panel title="Paid invoice" badge="+18%">
          <div className="metric big">$46540.00</div>
          <div className="sub">Current present year</div>
        </Panel>

        {/* <Panel title="Funds Received" badge="-59%" badgeType="danger">
          <div className="metric big">$345789.23</div>
          <div className="sub">Current present year</div>
        </Panel>

        <Panel title="Overall User Activity">
          <svg className="linechart" viewBox="0 0 300 120" preserveAspectRatio="none">
            <polyline fill="none" stroke="#a855f7" strokeWidth="3" points="0,110 30,100 60,90 90,85 120,70 150,90 180,60 210,80 240,40 270,55 300,20" />
          </svg>
        </Panel> */}
        {/* <br /> */}

        <Panel title="Customer order">
          <table className="orders">
            <thead>
              <tr>
                <th>Profile</th>
                <th>Address</th>
                <th>Date</th>
                <th>Status</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {[
                {name:'London', date:'01-04-2022', status:'Delivered', price:'$950'},
                {name:'Canada', date:'16-04-2022', status:'Delivered', price:'$1500'},
                {name:'Man city', date:'29-04-2022', status:'Pending', price:'$200'},
                {name:'New york', date:'10-05-2022', status:'Delivered', price:'$550'},
                {name:'England', date:'10-05-2022', status:'Pending', price:'$2500'},
              ].map((row, i) => (
                <tr key={i}>
                  <td className="profile"><span className={`dot color${i%5}`}></span> {row.name}</td>
                  <td>{row.name}</td>
                  <td>{row.date}</td>
                  <td><span className={`status ${row.status.toLowerCase()}`}>{row.status}</span></td>
                  <td className="price">{row.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </section>
    </div>
  )
}

function Card({ title, value, currency }) {
  return (
    <div className="card small">
      <div className="card-top">
        <h4>{title}</h4>
        <span className="icon">▢</span>
      </div>
      <div className="value">{currency ? '$' : ''}{value}</div>
    </div>
  )
}

function BigCard({ title, value, donutColor }) {
  return (
    <div className="card big">
      <h4>{title}</h4>
      <div className="big-content">
        <span className="value">{value}</span>
        <svg width="64" height="64" viewBox="0 0 36 36" className="donut">
          <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#eee" strokeWidth="3"></circle>
          <circle cx="18" cy="18" r="15.915" fill="transparent" stroke={donutColor} strokeWidth="3" strokeDasharray="70 30" strokeDashoffset="25" strokeLinecap="round"></circle>
        </svg>
      </div>
    </div>
  )
}

function Panel({ title, children, badge, badgeType }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <h4>{title}</h4>
        {badge ? <span className={`badge ${badgeType==='danger'?'danger':''}`}>{badge}</span> : null}
      </div>
      <div className="panel-body">{children}</div>
    </div>
  )
}