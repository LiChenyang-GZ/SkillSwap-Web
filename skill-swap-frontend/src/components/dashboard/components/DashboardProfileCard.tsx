import { Edit, GraduationCap, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent } from "../../ui/card";
import type { User } from "../../../types/user";
import { getUniversityDisplayName } from "../../onboarding/utils/universityMapper";

interface DashboardProfileCardProps {
  user: User;
  onEditProfile: () => void;
}

export function DashboardProfileCard({ user, onEditProfile }: DashboardProfileCardProps) {
  const hasSkills = user.skills.length > 0;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center">
          <Avatar className="w-20 h-20 mx-auto mb-4">
            <AvatarImage key={user.avatarUrl || "empty-avatar"} src={user.avatarUrl} alt={user.username} />
            <AvatarFallback className="text-lg">
              {user.username
                .split(" ")
                .map((n: string) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-semibold mb-4 break-words">{user.username}</h2>
          <div className="mb-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <GraduationCap className="h-4 w-4" />
            <span>{getUniversityDisplayName(user.university)}</span>
          </div>

          <Button variant="outline" size="sm" className="w-full mb-4" onClick={onEditProfile}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>

          {user.bio && <p className="text-sm text-muted-foreground mb-4">{user.bio}</p>}
        </div>

        <div className="border-t border-border pt-4 text-left">
          <h3 className="text-sm font-semibold text-foreground mb-2">Skills I can share</h3>
          {hasSkills ? (
            <ul className="flex flex-wrap gap-2" aria-label="Skills you can share">
              {user.skills.map((skill) => (
                <li key={skill}>
                  <Badge variant="outline" className="py-1 text-sm font-medium">
                    {skill}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <Sparkles className="mx-auto h-5 w-5 text-secondary" aria-hidden="true" />
              <p className="mt-2 text-sm text-muted-foreground">
                What could you teach someone? Add your first skill and let the community know.
              </p>
              <Button variant="link" size="sm" className="mt-1 text-primary" onClick={onEditProfile}>
                Add your skills
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
