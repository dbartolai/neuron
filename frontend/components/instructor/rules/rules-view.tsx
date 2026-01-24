"use client"

import { CourseRules, RuleObject } from "@/hooks/use-course-rules"
import { Badge } from "@/components/ui/badge"
import { H3, H4, Muted } from "@/components/primitives"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface RulesViewProps {
  rules: CourseRules | null
}

export function RulesView({ rules }: RulesViewProps) {
  if (!rules) {
    return <Muted text="No rules loaded" />
  }

  const renderRule = (rule: RuleObject | any, index: number) => {
    // Handle both RuleObject format and raw dict format
    const ruleType = typeof rule === "object" && "type" in rule ? rule.type : rule?.type || "REQUEST"
    const content = typeof rule === "object" && "content" in rule ? rule.content : rule?.content || String(rule)
    
    return (
      <div key={index} className="flex items-start gap-2 p-2 border rounded">
        <Badge variant="outline" className="shrink-0">
          {ruleType}
        </Badge>
        <span className="text-sm">{content}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {rules.goals && rules.goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {rules.goals.map((goal, idx) => (
                <li key={idx} className="text-sm">{goal}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {rules.prompt_rules && rules.prompt_rules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Prompt Rules</CardTitle>
            <Muted text="Rules that apply to student prompts" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rules.prompt_rules.map((rule, idx) => renderRule(rule, idx))}
            </div>
          </CardContent>
        </Card>
      )}

      {rules.output_rules && rules.output_rules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Output Rules</CardTitle>
            <Muted text="Rules that apply to assistant responses" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rules.output_rules.map((rule, idx) => renderRule(rule, idx))}
            </div>
          </CardContent>
        </Card>
      )}

      {rules.fallback_prompt && (
        <Card>
          <CardHeader>
            <CardTitle>Fallback Prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{rules.fallback_prompt}</p>
          </CardContent>
        </Card>
      )}

      {rules.outputs && rules.outputs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Outputs</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {rules.outputs.map((output, idx) => (
                <li key={idx} className="text-sm">{output}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {!rules.goals?.length && 
       !rules.prompt_rules?.length && 
       !rules.output_rules?.length && 
       !rules.fallback_prompt && 
       !rules.outputs?.length && (
        <Muted text="No rules configured" />
      )}
    </div>
  )
}
