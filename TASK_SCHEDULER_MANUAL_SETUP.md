# Configuración Manual de Tarea Programada de Backup

## ⚠️ IMPORTANTE
El script automático `create-backup-task.ps1` requiere permisos de Administrator. Si falla, sigue estos pasos manuales.

---

## 📋 PASOS MANUALES PARA CONFIGURAR BACKUP AUTOMATIZADO

### **Paso 1: Abrir Programador de Tareas como Administrator**

1. Presiona `Win + R`
2. Escribe `taskschd.msc`
3. **IMPORTANTE:** Right-click en "Task Scheduler" → "Run as administrator"

---

### **Paso 2: Crear Nueva Tarea**

1. En el panel derecho, click "Create Task" (no "Create Basic Task")
2. **General Tab:**
   - Name: `Urbaniq Database Backup`
   - Description: `Backup diario automatizado de la base de datos Urbaniq`
   - ✅ Run whether user is logged on or not
   - ✅ Run with highest privileges
   - Configure for: `Windows Server 2019` (o tu versión de Windows)

---

### **Paso 3: Configurar Trigger (Cuándo ejecutar)**

1. Ve a la tab "Triggers"
2. Click "New..."
3. **Settings:**
   - Begin the task: `On a schedule`
   - Settings: `Daily`
   - Start: `2:00:00 AM` (o cuando menos tráfico)
   - Recur every: `1 days`
   - ✅ Enabled
4. Click "OK"

---

### **Paso 4: Configurar Action (Qué ejecutar)**

1. Ve a la tab "Actions"
2. Click "New..."
3. **Settings:**
   - Action: `Start a program`
   - Program/script: `powershell.exe`
   - Add arguments:
     ```
     -ExecutionPolicy Bypass -File "C:\Users\sprit\CascadeProjects\Urbaniq\scripts\backup-database.ps1" -BackupPath "C:\Users\sprit\CascadeProjects\Urbaniq\backups" -DatabaseName "EcommerceDb" -ServerInstance "(localdb)\MSSQLLocalDB" -RetentionDays 7
     ```
   - Start in (optional): `C:\Users\sprit\CascadeProjects\Urbaniq\scripts`
4. Click "OK"

---

### **Paso 5: Configurar Condiciones**

1. Ve a la tab "Conditions"
2. **Settings:**
   - ✅ Start the task only if the computer is on AC power
   - ✅ Start the task only if the computer is idle for: `10 minutes`
   - ✅ Stop if the computer ceases to be idle: `60 minutes`
   - ✅ Wake the computer to run this task (si el servidor está en sleep mode)
   - ✅ Start only if the following network connection is available: `Any connection`

---

### **Paso 6: Configurar Settings**

1. Ve a la tab "Settings"
2. **Settings:**
   - ✅ Allow task to be run on demand
   - ✅ Run task as soon as possible after a scheduled start is missed
   - ✅ If the task fails, restart every: `5 minutes`
   - Attempt to restart up to: `3 times`
   - ✅ Stop the task if it runs longer than: `1 hour`
   - ✅ If the running task does not end when requested, force it to stop

---

### **Paso 7: Verificar y Probar**

1. Click "OK" para guardar la tarea
2. En la lista de tareas, busca "Urbaniq Database Backup"
3. **Prueba manual:**
   - Right-click → "Run"
   - Espera 1-2 minutos
   - Verifica que se creó un archivo `.bak` en `C:\Users\sprit\CascadeProjects\Urbaniq\backups`
   - Verifica el archivo `backup.log` en el mismo directorio

---

### **Paso 8: Configurar Historial de Tarea**

1. Right-click en "Urbaniq Database Backup" → "Properties"
2. Ve a la tab "History"
3. ✅ Enable Task History (si no está habilitado)
4. Click "Apply" → "OK"

---

## 🔍 VERIFICACIÓN POST-CONFIGURACIÓN

### **Verificar que la tarea existe:**
```powershell
Get-ScheduledTask -TaskName "Urbaniq Database Backup"
```

### **Verificar último backup:**
```powershell
Get-ChildItem C:\Users\sprit\CascadeProjects\Urbaniq\backups -Filter "EcommerceDb_*.bak" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 1 | 
    Format-List Name, LastWriteTime, Length
```

### **Verificar logs de backup:**
```powershell
Get-Content C:\Users\sprit\CascadeProjects\Urbaniq\backups\backup.log -Tail 20
```

---

## 🚨 SOLUCIÓN DE PROBLEMAS

### **Problema: "Access Denied"**
- Solución: Ejecutar Task Scheduler como Administrator
- Right-click en Task Scheduler → "Run as administrator"

### **Problema: "sqlcmd not found"**
- Solución: Instalar SQL Server Command Line Tools
- Descargar: https://learn.microsoft.com/en-us/sql/tools/sqlcmd-utility

### **Problema: Backup file not created**
- Verificar que el directorio de backups tiene permisos de escritura
- Verificar que SQL Server está corriendo
- Verificar logs en `backup.log`

### **Problema: Task not running at scheduled time**
- Verificar que el servicio "Task Scheduler" está corriendo
- Verificar que la hora del sistema es correcta
- Verificar History tab para errores

---

## 📋 CHECKLIST FINAL

- [ ] Task Scheduler abierto como Administrator
- [ ] Tarea "Urbaniq Database Backup" creada
- [ ] Trigger configurado (daily 2:00 AM)
- [ ] Action configurada (powershell + script)
- [ ] Condiciones configuradas
- [ ] Settings configurados
- [ ] Prueba manual ejecutada exitosamente
- [ ] Backup file creado exitosamente
- [ ] Backup file tiene contenido (> 0 bytes)
- [ ] Log file creado y sin errores
- [ ] History habilitado
- [ ] Tarea habilitada

---

## 🎯 NOTA IMPORTANTE

Para **producción**, debes cambiar los parámetros del script en la Action:

- **BackupPath:** Cambiar a un directorio de producción (ej: `D:\backups`)
- **DatabaseName:** Cambiar al nombre de DB de producción (ej: `UrbaniqProdDb`)
- **ServerInstance:** Cambiar al servidor SQL de producción (ej: `PROD-SQL-01`)
- **RetentionDays:** Recomendado 30 días para producción
