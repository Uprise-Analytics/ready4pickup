﻿'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Input } from '@components/ui/input'
import { Badge } from '@components/ui/badge'
import { Button } from '@components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@components/ui/table'
import type { School } from '@/types/database'
import { Search, ArrowRight } from 'lucide-react'

interface Props {
  schools: School[]
}

export function SchoolsTable({ schools }: Props) {
  const [search, setSearch] = useState('')

  const filtered = schools.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.slug.includes(search.toLowerCase())
  )

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="p-4 border-b border-slate-100">
        <div className="relative max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input className="pl-8 h-8 text-sm" placeholder="Search schools..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>School</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-slate-400 py-10">No schools found</TableCell>
            </TableRow>
          ) : (
            filtered.map((school) => (
              <TableRow key={school.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: school.primary_color ?? '#2563EB' }}
                    >
                      {school.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-slate-800 text-sm">{school.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-slate-500 text-sm font-mono">{school.slug}</TableCell>
                <TableCell className="text-slate-500 text-sm">{school.email ?? '--'}</TableCell>
                <TableCell>
                  <Badge variant={school.is_active ? 'secondary' : 'outline'} className={school.is_active ? 'bg-green-50 text-green-700' : 'text-slate-400'}>
                    {school.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Link href={`/schools/${school.id}`}>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-500 hover:text-blue-600">
                      View <ArrowRight size={12} className="ml-1" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
