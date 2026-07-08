import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Button, Typography } from 'antd'
import { MenuOutlined } from '@ant-design/icons'
import { gsap } from 'gsap'

import './StaggeredMenu.css'

export interface StaggeredMenuItem {
  key: string
  icon: ReactNode
  label: string
}

interface StaggeredMenuProps {
  brandKicker: string
  brandTitle: string
  items: StaggeredMenuItem[]
  selectedKey: string
  onSelect: (key: string) => void
}

export function StaggeredMenu({
  brandKicker,
  brandTitle,
  items,
  selectedKey,
  onSelect,
}: StaggeredMenuProps) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    setOpen(false)
  }, [selectedKey])

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const panel = panelRef.current
    const menuItems = itemRefs.current.filter(Boolean)

    if (!panel) {
      return
    }

    if (reduceMotion) {
      gsap.set([panel, ...menuItems], { clearProps: 'all' })
      return
    }

    if (open) {
      gsap.killTweensOf([panel, ...menuItems])
      gsap.set(menuItems, { opacity: 0, x: -18 })
      gsap.fromTo(
        panel,
        { opacity: 0, x: -28 },
        { opacity: 1, x: 0, duration: 0.36, ease: 'power2.out' },
      )
      gsap.to(menuItems, {
        opacity: 1,
        x: 0,
        duration: 0.32,
        stagger: 0.05,
        ease: 'power2.out',
        delay: 0.08,
      })
      return
    }

    gsap.killTweensOf([panel, ...menuItems])
    gsap.set(menuItems, { clearProps: 'opacity,transform' })
    gsap.set(panel, { clearProps: 'opacity,transform' })
  }, [open, selectedKey])

  useEffect(() => {
    if (!open) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  return (
    <>
      <Button
        type="text"
        size="large"
        icon={<MenuOutlined />}
        className={open ? 'staggered-menu-trigger is-open' : 'staggered-menu-trigger'}
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? '关闭导航菜单' : '打开导航菜单'}
        aria-expanded={open}
      />

      <div className={open ? 'staggered-menu-backdrop is-open' : 'staggered-menu-backdrop'} onClick={() => setOpen(false)} />

      <div ref={panelRef} className={open ? 'staggered-menu is-open' : 'staggered-menu'}>
        <div className="staggered-menu__brand">
          <Typography.Text className="brand-kicker">{brandKicker}</Typography.Text>
          <Typography.Title level={4} className="brand-title">
            {brandTitle}
          </Typography.Title>
        </div>

        <div className="staggered-menu__list">
          {items.map((item, index) => {
            const active = item.key === selectedKey

            return (
              <button
                key={item.key}
                ref={(element) => {
                  itemRefs.current[index] = element
                }}
                type="button"
                className={active ? 'staggered-menu__item is-active' : 'staggered-menu__item'}
                onClick={() => {
                  onSelect(item.key)
                  setOpen(false)
                }}
              >
                <span className="staggered-menu__icon">{item.icon}</span>
                <span className="staggered-menu__label">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
