#!/usr/bin/env node

const { exec } = require('child_process')
const port = process.argv[2] || 3003

console.log(`🔍 检查端口 ${port} 是否被占用...`)

exec(`lsof -ti:${port}`, (error, stdout, stderr) => {
  if (error) {
    // 端口未被占用，直接退出
    console.log(`✅ 端口 ${port} 可用`)
    process.exit(0)
  }

  const pids = stdout.trim().split('\n').filter(pid => pid.length > 0)

  if (pids.length === 0) {
    console.log(`✅ 端口 ${port} 可用`)
    process.exit(0)
  }

  console.log(`🔥 发现 ${pids.length} 个进程占用端口 ${port}，正在清理...`)

  // 杀死所有占用该端口的进程
  pids.forEach(pid => {
    try {
      process.kill(parseInt(pid), 'SIGTERM')
      console.log(`✅ 已终止进程 ${pid}`)
    } catch (err) {
      console.log(`⚠️  无法终止进程 ${pid}:`, err.message)
    }
  })

  // 等待一段时间让进程完全退出
  setTimeout(() => {
    console.log(`🎯 端口 ${port} 清理完成`)
    process.exit(0)
  }, 1000)
})