import { useMemo, useState } from 'react'
import { CalendarPlus, ClipboardList, LogOut, ShieldAlert, UserPlus } from 'lucide-react'
import { Alert, AlertDescription } from '@uipath/apollo-wind/components/ui/alert'
import { Button } from '@uipath/apollo-wind/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@uipath/apollo-wind/components/ui/card'
import { Spinner } from '@uipath/apollo-wind/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@uipath/apollo-wind/components/ui/tabs'
import { Toaster } from '@uipath/apollo-wind/components/ui/sonner'
import logo from './assets/logo.svg'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ThemeToggle } from './components/Theme'
import { BRAND_NAME } from './lib/constants'
import { ClinicData } from './lib/df'
import { BookAppointment } from './pages/BookAppointment'
import { DoctorEmergency } from './pages/DoctorEmergency'
import { ManageAppointments } from './pages/ManageAppointments'
import { RegisterPatient } from './pages/RegisterPatient'

function AppContent() {
  const { isAuthenticated, isLoading, login, logout, error, sdk } = useAuth()
  const data = useMemo(() => new ClinicData(sdk), [sdk])
  const [tab, setTab] = useState('book')

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner label="Initializing…" showLabel />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center text-center">
            <img src={logo} alt="" className="mb-2 h-12 w-12" />
            <CardTitle>{BRAND_NAME}</CardTitle>
            <CardDescription>Sign in with your UiPath account to continue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button onClick={login} className="w-full">
              Sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <img src={logo} alt="" className="h-7 w-7 shrink-0" />
          <h1 className="truncate text-base font-semibold">{BRAND_NAME}</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <Tabs value={tab} onValueChange={setTab} className="mx-auto max-w-4xl">
          <TabsList className="mb-6 grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="book">
              <CalendarPlus className="mr-1 h-4 w-4" /> Book
            </TabsTrigger>
            <TabsTrigger value="register">
              <UserPlus className="mr-1 h-4 w-4" /> Register
            </TabsTrigger>
            <TabsTrigger value="manage">
              <ClipboardList className="mr-1 h-4 w-4" /> Appointments
            </TabsTrigger>
            <TabsTrigger value="emergency">
              <ShieldAlert className="mr-1 h-4 w-4" /> Emergency
            </TabsTrigger>
          </TabsList>
          <TabsContent value="book">
            <BookAppointment data={data} />
          </TabsContent>
          <TabsContent value="register">
            <RegisterPatient data={data} />
          </TabsContent>
          <TabsContent value="manage">
            <ManageAppointments data={data} />
          </TabsContent>
          <TabsContent value="emergency">
            <DoctorEmergency data={data} />
          </TabsContent>
        </Tabs>
      </main>
      <Toaster />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
