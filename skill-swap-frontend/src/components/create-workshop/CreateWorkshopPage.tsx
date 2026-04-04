import { CreateWorkshopForm } from './CreateWorkshopForm';

export function CreateWorkshopPage() {
  return (
    <div className="min-h-screen bg-background pt-20 lg:pt-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold">Create Workshop</h1>
          <p className="text-muted-foreground">
            Thank you for collaborating with the SkillSwap Club! We are excited about your upcoming workshop and the opportunity to share your skill with our community.
          </p>
          <p className="text-muted-foreground">
            Please complete this form to confirm the final details so we can ensure everything runs smoothly.
          </p>
          <p className="text-muted-foreground">
            If you have any questions, please feel free to reach out to our Events Team: Danu (0490091587), Jace (0430246422).
          </p>
        </header>

        <CreateWorkshopForm />
      </div>
    </div>
  );
}
