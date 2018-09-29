class ScoresheetValidations {
  constructor (Configuration, User) {
    Object.assign(this, { Configuration, User })
  }

  validate (scorehseet) {
    return this.Configuration.load()
      .then(config => {
        const isRef = this.User.isRef()
        const errors = []

        // Mission errors
        scorehseet.missions.forEach(mission => {
          if (!mission.complete) {
            errors.push({ error: 'Some missions are incomplete', mission })
          } else if (mission.error) {
            errors.push({ error: mission.error, mission })
          }
        })

        if (isRef && config.requireRef && typeof scorehseet.referee === 'undefined') {
          errors.push({ error: 'Missing referee' })
        }

        if (isRef && config.requireTable && typeof scorehseet.tableId === 'undefined') {
          errors.push({ error: 'Missing table' })
        }

        if (typeof scorehseet.teamNumber === 'undefined') {
          errors.push({ error: 'Missing team' })
        }

        if (typeof scorehseet.matchId === 'undefined') {
          errors.push({ error: 'Missing round' })
        }

        if (config.requireSignature && scorehseet.signature.isEmpty) {
          errors.push({ error: 'Missing signature' })
        }

        return errors
      })
  }
}

ScoresheetValidations.$$ngIsClass = true
ScoresheetValidations.$inject = ['Configuration', 'User']

export default ScoresheetValidations
